import type { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import config from "../config";
import { AppError } from "../utils/AppError";
import { Prisma } from "../../../prisma/generated/prisma/client";

export const globalErrorHandler = (
	err: any,
	_req: Request,
	res: Response,
	_next: NextFunction,
) => {
	if (config.node_env === "development") {
		console.error("Error from Global Error Handler:", err);
	}

	let statusCode: number = httpStatus.INTERNAL_SERVER_ERROR;
	let message = err.message || "Something went wrong";
	let errors: unknown[] = [];

	if (err instanceof Prisma.PrismaClientValidationError) {
		statusCode = httpStatus.BAD_REQUEST;
		message = "Invalid or missing fields in the request";
	} else if (err.type === "entity.parse.failed") {
		statusCode = httpStatus.BAD_REQUEST;
		message = "Invalid JSON in request body";
	} else if (err instanceof Prisma.PrismaClientKnownRequestError) {
		if (err.code === "P2002") {
			statusCode = httpStatus.CONFLICT;
			message = `Duplicate value for field(s): ${(err.meta?.target as string[])?.join(", ")}`;
		} else if (err.code === "P2003") {
			statusCode = httpStatus.BAD_REQUEST;
			message = "Foreign key constraint failed";
		} else if (err.code === "P2025") {
			statusCode = httpStatus.NOT_FOUND;
			message = "The requested record was not found";
		}
	} else if (err instanceof AppError) {
		statusCode = err.statusCode;
		message = err.message;
	} else if (err.name === "ZodError") {
		statusCode = httpStatus.BAD_REQUEST;
		message = "Validation error";
		errors = err.issues;
	} else if (err instanceof Error) {
		message = err.message;
	}

	res.status(statusCode).json({
		success: false,
		message,
		errors,
		stack: config.node_env === "development" ? err.stack : undefined,
	});
};
