import type { Request } from "express";
import multer, { type FileFilterCallback } from "multer";
import { AppError } from "../utils/AppError";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB


const storage = multer.memoryStorage();

const fileFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
	if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
		return cb(new AppError(400, "Only JPEG, PNG, and WEBP images are allowed"));
	}
	cb(null, true);
};

export const upload = multer({
	storage,
	fileFilter,
	limits: { fileSize: MAX_FILE_SIZE_BYTES },
});