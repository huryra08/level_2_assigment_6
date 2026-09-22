import { z } from "zod";

const UpdateProfileZodSchema = z.object({
	name: z.string().min(2).optional(),
	phone: z.string().optional(),
});

export const UserValidation = {
	UpdateProfileZodSchema,
};
