import { z } from "zod";

const AmbulanceTypeEnum = z.enum(["BASIC", "ADVANCED_LIFE_SUPPORT", "ICU", "NEONATAL"]);
const AmbulanceStatusEnum = z.enum(["AVAILABLE", "ON_TRIP", "MAINTENANCE", "OUT_OF_SERVICE"]);

const CreateAmbulanceZodSchema = z.object({
	plateNumber: z.string().min(2),
	type: AmbulanceTypeEnum.optional(),
	homeHospitalId: z.string().uuid().optional(),
	driverId: z.string().uuid().optional(),
});

const UpdateAmbulanceZodSchema = z.object({
	type: AmbulanceTypeEnum.optional(),
	status: AmbulanceStatusEnum.optional(),
	homeHospitalId: z.string().uuid().nullable().optional(),
	driverId: z.string().uuid().nullable().optional(),
});

export const AmbulanceValidation = {
	CreateAmbulanceZodSchema,
	UpdateAmbulanceZodSchema,
};
