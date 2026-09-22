import bcrypt from "bcryptjs";
import crypto from "crypto";
import ejs from "ejs";
import type { TokenPayload } from "google-auth-library";
import httpStatus from "http-status";
import type { JwtPayload, SignOptions } from "jsonwebtoken";
import path from "path";
//import { AuthProvider, Role, UserStatus } from "../../../generated/prisma";
import config from "../../config";
import { googleClient } from "../../lib/googleAuth";
import { transporter } from "../../lib/nodemailer";
import { prisma } from "../../lib/prisma";
import { redisClient } from "../../lib/redis";
import { AppError } from "../../utils/AppError";
import { jwtUtils } from "../../utils/jwt";
import type {
	IChangePasswordPayload,
	IForgotPasswordPayload,
	IGoogleLoginPayload,
	ILoginUserPayload,
	IRegisterUserPayload,
	IRequestUser,
	IResetPasswordPayload,
	IVerifyEmailPayload,
} from "./auth.interface";
import { AuthProvider, Role, UserStatus } from "../../../../prisma/generated/prisma/enums";

const OTP_EXPIRY_SECONDS = 5 * 60;

const generateAuthTokens = (user: { id: string; name: string; email: string; role: Role }) => {
	const jwtPayload = {
		userId: user.id,
		name: user.name,
		email: user.email,
		role: user.role,
	};

	const accessToken = jwtUtils.createToken(
		jwtPayload,
		config.jwt_access_secret,
		config.jwt_access_expires_in as SignOptions["expiresIn"],
	);

	const refreshToken = jwtUtils.createToken(
		jwtPayload,
		config.jwt_refresh_secret,
		config.jwt_refresh_expires_in as SignOptions["expiresIn"],
	);

	return { accessToken, refreshToken };
};

const renderTemplate = async (templateName: string, data: Record<string, unknown>) => {
	const templatePath = path.join(process.cwd(), "src/app/templates", `${templateName}.ejs`);
	return ejs.renderFile(templatePath, data);
};


const registerUser = async (payload: IRegisterUserPayload) => {
	const email = payload.email.trim().toLowerCase();

	const existingUser = await prisma.user.findUnique({ where: { email } });

	if (existingUser) {
		throw new AppError(httpStatus.CONFLICT, "A user with this email already exists");
	}

	const hashedPassword = await bcrypt.hash(payload.password, Number(config.bcrypt_salt_rounds));
	const otp = crypto.randomInt(100000, 1000000).toString();

	await redisClient.set(`register-otp:${email}`, otp, { EX: OTP_EXPIRY_SECONDS });
	await redisClient.set(
		`register-data:${email}`,
		JSON.stringify({
			name: payload.name,
			email,
			phone: payload.phone,
			password: hashedPassword,
		}),
		{ EX: OTP_EXPIRY_SECONDS },
	);

	const html = await renderTemplate("registration-otp", {
		name: payload.name,
		otp,
		expirationMinutes: OTP_EXPIRY_SECONDS / 60,
	});

	await transporter.sendMail({
		from: config.email_sender,
		to: email,
		subject: "Verify your email - Emergency Ambulance Dispatch",
		html,
	});
};

const verifyEmail = async (payload: IVerifyEmailPayload) => {
	const email = payload.email.trim().toLowerCase();

	const existingUser = await prisma.user.findUnique({ where: { email } });
	if (existingUser?.emailVerified) {
		throw new AppError(httpStatus.CONFLICT, "Email is already verified");
	}

	const otpKey = `register-otp:${email}`;
	const redisOtp = await redisClient.get(otpKey);

	if (!redisOtp) {
		throw new AppError(httpStatus.BAD_REQUEST, "OTP expired. Please register again.");
	}
	if (redisOtp !== payload.otp) {
		throw new AppError(httpStatus.BAD_REQUEST, "Invalid OTP");
	}

	const dataKey = `register-data:${email}`;
	const redisData = await redisClient.get(dataKey);

	if (!redisData) {
		throw new AppError(httpStatus.BAD_REQUEST, "Registration session expired. Please register again.");
	}

	const parsed = JSON.parse(redisData) as {
		name: string;
		email: string;
		phone?: string;
		password: string;
	};

	const user = await prisma.user.create({
		data: {
			name: parsed.name,
			email: parsed.email,
			phone: parsed.phone,
			password: parsed.password,
			role: Role.USER,
			status: UserStatus.ACTIVE,
			emailVerified: true,
			authProvider: AuthProvider.CREDENTIAL,
		},
	});

	await redisClient.del([otpKey, dataKey]);

	const html = await renderTemplate("welcome", { name: user.name });
	await transporter.sendMail({
		from: config.email_sender,
		to: user.email,
		subject: "Welcome to Emergency Ambulance Dispatch",
		html,
	});

	const tokens = generateAuthTokens(user);

	const { password: _pw, ...safeUser } = user;

	return { user: safeUser, ...tokens };
};

const loginUser = async (payload: ILoginUserPayload) => {
	const email = payload.email.trim().toLowerCase();

	const user = await prisma.user.findUnique({ where: { email } });

	if (!user) {
		throw new AppError(httpStatus.NOT_FOUND, "User not found");
	}
	if (user.isDeleted || user.status === UserStatus.DELETED) {
		throw new AppError(httpStatus.FORBIDDEN, "This account has been deleted");
	}
	if (user.status === UserStatus.BLOCKED) {
		throw new AppError(httpStatus.FORBIDDEN, "This account has been blocked");
	}
	if (!user.emailVerified) {
		throw new AppError(httpStatus.FORBIDDEN, "Please verify your email before logging in");
	}
	if (!user.password) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"This account uses Google Sign-In. Please continue with Google.",
		);
	}

	const isPasswordMatched = await bcrypt.compare(payload.password, user.password);
	if (!isPasswordMatched) {
		throw new AppError(httpStatus.UNAUTHORIZED, "Invalid credentials");
	}

	return generateAuthTokens(user);
};

const getMe = async (requestUser: IRequestUser) => {
	const user = await prisma.user.findUnique({
		where: { id: requestUser.userId },
		include: { driver: { include: { ambulance: true } } },
		omit: { password: true },
	});

	if (!user) {
		throw new AppError(httpStatus.NOT_FOUND, "User not found");
	}

	return user;
};

const refreshToken = async (token: string) => {
	const verified = jwtUtils.verifyToken(token, config.jwt_refresh_secret);

	if (!verified.success || !verified.data) {
		throw new AppError(httpStatus.UNAUTHORIZED, "Invalid or expired refresh token");
	}

	const data = verified.data as JwtPayload;

	const user = await prisma.user.findUnique({ where: { id: data.userId } });

	if (!user || user.isDeleted || user.status !== UserStatus.ACTIVE) {
		throw new AppError(httpStatus.UNAUTHORIZED, "User is inactive or not found");
	}

	return generateAuthTokens(user);
};

const googleLogin = async (payload: IGoogleLoginPayload) => {
	let googlePayload: TokenPayload | undefined;

	try {
		const ticket = await googleClient.verifyIdToken({
			idToken: payload.idToken,
			audience: config.google_client_id,
		});
		googlePayload = ticket.getPayload();
	} catch (error) {
		throw new AppError(httpStatus.UNAUTHORIZED, "Invalid or expired Google id token");
	}

	if (!googlePayload?.email) {
		throw new AppError(httpStatus.BAD_REQUEST, "Google account has no email associated");
	}

	const email = googlePayload.email.trim().toLowerCase();

	let user = await prisma.user.findUnique({ where: { email } });

	if (!user) {
		user = await prisma.user.create({
			data: {
				name: googlePayload.name || email.split("@")[0] || email,
				email,
				role: Role.USER,
				status: UserStatus.ACTIVE,
				googleId: googlePayload.sub,
				authProvider: AuthProvider.GOOGLE,
				emailVerified: true,
			},
		});

		const html = await renderTemplate("welcome", { name: user.name });
		await transporter.sendMail({
			from: config.email_sender,
			to: user.email,
			subject: "Welcome to Emergency Ambulance Dispatch",
			html,
		});
	} else {
		if (user.isDeleted || user.status === UserStatus.DELETED) {
			throw new AppError(httpStatus.FORBIDDEN, "This account has been deleted");
		}
		if (user.status === UserStatus.BLOCKED) {
			throw new AppError(httpStatus.FORBIDDEN, "This account has been blocked");
		}

		if (!user.googleId) {
			user = await prisma.user.update({
				where: { id: user.id },
				data: { googleId: googlePayload.sub, emailVerified: true },
			});
		}
	}

	return generateAuthTokens(user);
};

const forgotPassword = async (payload: IForgotPasswordPayload) => {
	const email = payload.email.trim().toLowerCase();

	const user = await prisma.user.findUnique({ where: { email } });

	if (!user) {
		throw new AppError(httpStatus.NOT_FOUND, "User not found");
	}
	if (user.status === UserStatus.BLOCKED) {
		throw new AppError(httpStatus.FORBIDDEN, "This account has been blocked");
	}
	if (user.isDeleted || user.status === UserStatus.DELETED) {
		throw new AppError(httpStatus.FORBIDDEN, "This account has been deleted");
	}
	if (!user.password && user.authProvider === AuthProvider.GOOGLE) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"This account uses Google Sign-In and has no password to reset",
		);
	}

	const otp = crypto.randomInt(100000, 1000000).toString();
	await redisClient.set(`forgot-password-otp:${email}`, otp, { EX: OTP_EXPIRY_SECONDS });

	const html = await renderTemplate("forgot-password", {
		name: user.name,
		otp,
		expirationMinutes: OTP_EXPIRY_SECONDS / 60,
	});

	await transporter.sendMail({
		from: config.email_sender,
		to: user.email,
		subject: "Reset your password",
		
		html
	});
};

const resetPassword = async (payload: IResetPasswordPayload) => {
	const email = payload.email.trim().toLowerCase();

	const user = await prisma.user.findUnique({ where: { email } });

	if (!user) {
		throw new AppError(httpStatus.NOT_FOUND, "User not found");
	}

	const otpKey = `forgot-password-otp:${email}`;
	const redisOtp = await redisClient.get(otpKey);

	if (!redisOtp) {
		throw new AppError(httpStatus.BAD_REQUEST, "OTP expired. Please request a new one.");
	}
	if (redisOtp !== payload.otp) {
		throw new AppError(httpStatus.BAD_REQUEST, "Invalid OTP");
	}

	const hashedPassword = await bcrypt.hash(payload.newPassword, Number(config.bcrypt_salt_rounds));

	await prisma.user.update({
		where: { email },
		data: { password: hashedPassword, needPasswordChange: false },
	});

	await redisClient.del([otpKey]);

	const html = await renderTemplate("reset-password-success", { name: user.name });
	await transporter.sendMail({
		from: config.email_sender,
		to: user.email,
		subject: "Your password was changed",
		html,
	});
};

const changePassword = async (requestUser: IRequestUser, payload: IChangePasswordPayload) => {
	const user = await prisma.user.findUnique({ where: { id: requestUser.userId } });

	if (!user || !user.password) {
		throw new AppError(httpStatus.BAD_REQUEST, "Password change is not available for this account");
	}

	const isMatched = await bcrypt.compare(payload.oldPassword, user.password);
	if (!isMatched) {
		throw new AppError(httpStatus.UNAUTHORIZED, "Old password is incorrect");
	}

	const hashedPassword = await bcrypt.hash(payload.newPassword, Number(config.bcrypt_salt_rounds));

	await prisma.user.update({
		where: { id: user.id },
		data: { password: hashedPassword, needPasswordChange: false },
	});
};

export const AuthService = {
	registerUser,
	verifyEmail,
	loginUser,
	getMe,
	refreshToken,
	googleLogin,
	forgotPassword,
	resetPassword,
	changePassword,
};
