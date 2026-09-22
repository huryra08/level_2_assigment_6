import { z } from "zod";

const InitiatePaymentZodSchema = z.object({
	emergencyRequestId: z.string().uuid(),
	gateway: z.enum(["BKASH", "SSLCOMMERZ"]),
});

const BkashExecuteZodSchema = z.object({
	paymentID: z.string().min(1),
});

export const PaymentValidation = {
	InitiatePaymentZodSchema,
	BkashExecuteZodSchema,
};
