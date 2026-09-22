import rateLimit from "express-rate-limit";


export const globalRateLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	limit: 300,
	standardHeaders: true,
	legacyHeaders: false,
	message: {
		success: false,
		message: "Too many requests. Please try again later.",
		errors: [],
	},
});


export const strictRateLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	limit: 20,
	standardHeaders: true,
	legacyHeaders: false,
	message: {
		success: false,
		message: "Too many attempts. Please slow down and try again later.",
		errors: [],
	},
});

export const emergencyRequestLimiter = rateLimit({
	windowMs: 5 * 60 * 1000,
	limit: 5,
	standardHeaders: true,
	legacyHeaders: false,
	message: {
		success: false,
		message: "Too many emergency requests submitted. Please wait a few minutes.",
		errors: [],
	},
});
