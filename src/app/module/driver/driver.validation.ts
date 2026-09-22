import { z } from "zod";

const CreateDriverZodSchema = z.object({
	name: z.string().min(2),
	email: z.string().email(),
	password: z.string().min(6),
	phone: z.string().optional(),
	licenseNumber: z.string().min(3),
	yearsOfExperience: z.number().int().min(0).optional(),
});

const UpdateDriverZodSchema = z.object({
	licenseNumber: z.string().min(3).optional(),
	yearsOfExperience: z.number().int().min(0).optional(),
});

const VerifyDriverZodSchema = z.object({
	verificationStatus: z.enum(["APPROVED", "REJECTED"]),
	rejectionReason: z.string().optional(),
});

const UpdateAvailabilityZodSchema = z.object({
	availability: z.enum(["OFFLINE", "AVAILABLE", "ON_TRIP"]),
});

const UpdateLocationZodSchema = z.object({
	lat: z.number().min(-90).max(90),
	lng: z.number().min(-180).max(180),
});

export const DriverValidation = {
	CreateDriverZodSchema,
	UpdateDriverZodSchema,
	VerifyDriverZodSchema,
	UpdateAvailabilityZodSchema,
	UpdateLocationZodSchema,
};
