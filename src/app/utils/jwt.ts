import jwt, { type JwtPayload, type SignOptions } from "jsonwebtoken";

const createToken = (
	payload: JwtPayload,
	secret: string,
	expiresIn: SignOptions["expiresIn"],
) => {
	return jwt.sign(payload, secret, { expiresIn });
};

const verifyToken = (token: string, secret: string) => {
	try {
		const verifiedToken = jwt.verify(token, secret);
		return {
			success: true as const,
			data: verifiedToken,
			error: undefined,
		};
	} catch (error: any) {
		return {
			success: false as const,
			data: undefined,
			error: error.message as string,
		};
	}
};

export const jwtUtils = {
	createToken,
	verifyToken,
};
