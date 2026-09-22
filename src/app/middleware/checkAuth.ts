import type { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import type { JwtPayload } from "jsonwebtoken";
import config from "../config";
import { prisma } from "../lib/prisma";
import { AppError } from "../utils/AppError";
import { catchAsync } from "../utils/catchAsync";
import { jwtUtils } from "../utils/jwt";
import { Role } from "../../../prisma/generated/prisma/enums";

export interface RequestUser {
	email: string;
	name: string;
	userId: string;
	role: Role;
}

declare global {
	namespace Express {
		interface Request {
			user?: RequestUser;
		}
	}
}


export const auth = (...requiredRoles: Role[]) => {
	return catchAsync(async (req: Request, _res: Response, next: NextFunction) => {
		const authHeader = req.headers.authorization;
		const token = req.cookies?.accessToken
			? req.cookies.accessToken
			: authHeader?.startsWith("Bearer ")
				? authHeader.split(" ")[1]
				: authHeader;

		if (!token) {
			throw new AppError(
				httpStatus.UNAUTHORIZED,
				"You are not logged in. Please log in to access this resource.",
			);
		}

		const verifiedToken = jwtUtils.verifyToken(token, config.jwt_access_secret);

		if (!verifiedToken.success || !verifiedToken.data) {
			throw new AppError(httpStatus.UNAUTHORIZED, verifiedToken.error || "Invalid token");
		}

		const { email, name, userId, role } = verifiedToken.data as JwtPayload;

		if (requiredRoles.length && !requiredRoles.includes(role)) {
			throw new AppError(
				httpStatus.FORBIDDEN,
				"Forbidden. You don't have permission to access this resource.",
			);
		}

		const user = await prisma.user.findUnique({ where: { id: userId } });

		if (!user || user.isDeleted || user.status === "DELETED") {
			throw new AppError(httpStatus.UNAUTHORIZED, "User not found. Please log in again.");
		}

		if (user.status === "BLOCKED") {
			throw new AppError(
				httpStatus.FORBIDDEN,
				"Your account has been blocked. Please contact support.",
			);
		}

		req.user = { email, name, userId, role };

		next();
	});
};
