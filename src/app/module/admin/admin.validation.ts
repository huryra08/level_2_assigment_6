import { z } from "zod";

const UpdateUserStatusZodSchema = z.object({
	status: z.enum(["ACTIVE", "BLOCKED"]),
});

export const AdminValidation = {
	UpdateUserStatusZodSchema,
};
