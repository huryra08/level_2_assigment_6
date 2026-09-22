import { z } from "zod";

const RegisterZodSchema = z.object({
	name: z.string({ message: "Name is required" }).min(2).max(100),
	email: z.string({ message: "Email is required" }).email(),
	phone: z.string().min(6).max(20).optional(),
	password: z
		.string({ message: "Password is required" })
		.min(6, "Password must be at least 6 characters"),
});

const VerifyEmailZodSchema = z.object({
	email: z.string().email(),
	otp: z.string().length(6, "OTP must be 6 digits"),
});

const LoginZodSchema = z.object({
	email: z.string({ message: "Email is required" }).email(),
	password: z.string({ message: "Password is required" }),
});

const GoogleLoginZodSchema = z.object({
	idToken: z
		.string({ message: "Google idToken is required" })
		.trim()
		.min(1, "Google idToken is required"),
});

const ForgotPasswordZodSchema = z.object({
	email: z.string().email(),
});

const ResetPasswordZodSchema = z.object({
	email: z.string().email(),
	otp: z.string().length(6, "OTP must be 6 digits"),
	newPassword: z.string().min(6, "Password must be at least 6 characters"),
});

const ChangePasswordZodSchema = z.object({
	oldPassword: z.string({ message: "Old password is required" }),
	newPassword: z
		.string({ message: "New password is required" })
		.min(6, "Password must be at least 6 characters"),
});

export const AuthValidation = {
	RegisterZodSchema,
	VerifyEmailZodSchema,
	LoginZodSchema,
	GoogleLoginZodSchema,
	ForgotPasswordZodSchema,
	ResetPasswordZodSchema,
	ChangePasswordZodSchema,
};
