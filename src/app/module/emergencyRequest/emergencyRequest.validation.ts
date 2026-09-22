import { z } from "zod";

const PriorityEnum = z.enum(["CRITICAL", "HIGH", "MEDIUM", "LOW"]);

const CreateEmergencyRequestZodSchema = z.object({
	patientName: z.string().min(2),
	patientPhone: z.string().min(6),
	patientAge: z.number().int().min(0).max(130).optional(),
	patientGender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
	notes: z.string().optional(),
	pickupAddress: z.string().min(3),
	pickupLat: z.number().min(-90).max(90),
	pickupLng: z.number().min(-180).max(180),
	priority: PriorityEnum.optional(),
});

const AssignAmbulanceZodSchema = z.object({
	ambulanceId: z.string().uuid("A valid ambulanceId is required"),
});

const UpdateStatusZodSchema = z.object({
	status: z.enum([
		"DRIVER_EN_ROUTE",
		"ARRIVED_AT_PICKUP",
		"PATIENT_ONBOARD",
		"EN_ROUTE_TO_HOSPITAL",
		"ARRIVED_AT_HOSPITAL",
		"COMPLETED",
	]),
	hospitalId: z.string().uuid().optional(),
	distanceKm: z.number().min(0).optional(),
	fareAmount: z.number().min(0).optional(),
});

const CancelRequestZodSchema = z.object({
	cancelReason: z.string().min(3, "Please provide a cancellation reason"),
});

export const EmergencyRequestValidation = {
	CreateEmergencyRequestZodSchema,
	AssignAmbulanceZodSchema,
	UpdateStatusZodSchema,
	CancelRequestZodSchema,
};
