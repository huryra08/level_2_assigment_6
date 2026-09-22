import type { Request, Response } from "express";
import httpStatus from "http-status";
import { AppError } from "../../utils/AppError";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import type { IRequestUser } from "./auth.interface";
import { AuthService } from "./auth.service";

const COOKIE_OPTS_ACCESS = {
	httpOnly: true,
	secure: process.env.NODE_ENV === "production",
	sameSite: "none" as const,
	maxAge: 1000 * 60 * 60 * 24,
};

const COOKIE_OPTS_REFRESH = {
	httpOnly: true,
	secure: process.env.NODE_ENV === "production",
	sameSite: "none" as const,
	maxAge: 1000 * 60 * 60 * 24 * 30,
};

const setAuthCookies = (res: Response, accessToken: string, refreshToken: string) => {
	res.cookie("accessToken", accessToken, COOKIE_OPTS_ACCESS);
	res.cookie("refreshToken", refreshToken, COOKIE_OPTS_REFRESH);
};

const register = catchAsync(async (req: Request, res: Response) => {
	await AuthService.registerUser(req.body);

	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: `Verification OTP sent to ${req.body.email}`,
		data: null,
	});
});

const verifyEmail = catchAsync(async (req: Request, res: Response) => {
	const result = await AuthService.verifyEmail(req.body);
	setAuthCookies(res, result.accessToken, result.refreshToken);

	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Email verified successfully",
		data: result,
	});
});

const login = catchAsync(async (req: Request, res: Response) => {
	const result = await AuthService.loginUser(req.body);
	setAuthCookies(res, result.accessToken, result.refreshToken);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Logged in successfully",
		data: result,
	});
});

const googleLogin = catchAsync(async (req: Request, res: Response) => {
	const result = await AuthService.googleLogin(req.body);
	setAuthCookies(res, result.accessToken, result.refreshToken);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Logged in with Google successfully",
		data: result,
	});
});

const getMe = catchAsync(async (req: Request, res: Response) => {
	const user = req.user as unknown as IRequestUser;
	if (!user) throw new AppError(httpStatus.UNAUTHORIZED, "Missing user in request");

	const result = await AuthService.getMe(user);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Profile fetched successfully",
		data: result,
	});
});

const refreshToken = catchAsync(async (req: Request, res: Response) => {
	const token = req.cookies?.refreshToken || req.body.refreshToken;
	if (!token) throw new AppError(httpStatus.UNAUTHORIZED, "Refresh token is missing");

	const result = await AuthService.refreshToken(token);
	setAuthCookies(res, result.accessToken, result.refreshToken);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "New tokens generated successfully",
		data: result,
	});
});

const logout = catchAsync(async (_req: Request, res: Response) => {
	res.clearCookie("accessToken");
	res.clearCookie("refreshToken");

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Logged out successfully",
		data: null,
	});
});

const forgotPassword = catchAsync(async (req: Request, res: Response) => {
	await AuthService.forgotPassword(req.body);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: `Password reset OTP sent to ${req.body.email}`,
		data: null,
	});
});

const resetPassword = catchAsync(async (req: Request, res: Response) => {
	await AuthService.resetPassword(req.body);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Password reset successfully",
		data: null,
	});
});

const changePassword = catchAsync(async (req: Request, res: Response) => {
	const user = req.user as unknown as IRequestUser;

	await AuthService.changePassword(user, req.body);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Password changed successfully",
		data: null,
	});
});

export const AuthController = {
	register,
	verifyEmail,
	login,
	googleLogin,
	getMe,
	refreshToken,
	logout,
	forgotPassword,
	resetPassword,
	changePassword,
};
