import type { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import type { ZodObject, ZodRawShape } from "zod";
import { AppError } from "../utils/AppError";
import { catchAsync } from "../utils/catchAsync";

export const validateRequest = (zodSchema: ZodObject<ZodRawShape>) => {
	return catchAsync((req: Request, _res: Response, next: NextFunction) => {
		const payload = req.body ?? {};

		const result = zodSchema.safeParse(payload);

		if (!result.success) {
			const firstIssue = result.error.issues[0];
			throw new AppError(
				httpStatus.BAD_REQUEST,
				firstIssue?.message || "Validation failed",
			);
		}

		req.body = result.data;

		next();
	});
};

export const validateQuery = (zodSchema: ZodObject<ZodRawShape>) => {
	return catchAsync((req: Request, _res: Response, next: NextFunction) => {
		const result = zodSchema.safeParse(req.query ?? {});

		if (!result.success) {
			const firstIssue = result.error.issues[0];
			throw new AppError(
				httpStatus.BAD_REQUEST,
				firstIssue?.message || "Invalid query parameters",
			);
		}

		next();
	});
};
