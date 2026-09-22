import { z } from "zod";

const CreateHospitalZodSchema = z.object({
	name: z.string().min(2),
	address: z.string().min(3),
	lat: z.number().min(-90).max(90),
	lng: z.number().min(-180).max(180),
	contactNumber: z.string().min(5),
	hasEmergencyUnit: z.boolean().optional(),
	bedCapacity: z.number().int().min(0).optional(),
});

const UpdateHospitalZodSchema = z.object({
	name: z.string().min(2).optional(),
	address: z.string().min(3).optional(),
	lat: z.number().min(-90).max(90).optional(),
	lng: z.number().min(-180).max(180).optional(),
	contactNumber: z.string().min(5).optional(),
	hasEmergencyUnit: z.boolean().optional(),
	bedCapacity: z.number().int().min(0).optional(),
	isActive: z.boolean().optional(),
});

export const HospitalValidation = {
	CreateHospitalZodSchema,
	UpdateHospitalZodSchema,
};
