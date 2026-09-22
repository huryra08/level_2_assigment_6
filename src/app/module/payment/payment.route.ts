import { Router } from "express";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { PaymentController } from "./payment.controller";
import { PaymentValidation } from "./payment.validation";
import { Role } from "../../../../prisma/generated/prisma/enums";

const router = Router();

// --- Caller-initiated checkout ---
router.post(
	"/initiate",
	auth(Role.USER),
	validateRequest(PaymentValidation.InitiatePaymentZodSchema),
	PaymentController.initiatePayment,
);


router.post(
	"/bkash/execute",
	auth(Role.USER),
	validateRequest(PaymentValidation.BkashExecuteZodSchema),
	PaymentController.bkashExecute,
);
router.get("/bkash/callback", PaymentController.bkashCallback); // bKash server -> our server redirect, no auth possible
router.post("/bkash/callback", PaymentController.bkashCallback);


router.post("/sslcommerz/success", PaymentController.sslCommerzSuccess);
router.post("/sslcommerz/fail", PaymentController.sslCommerzFail);
router.post("/sslcommerz/cancel", PaymentController.sslCommerzCancel);
router.post("/sslcommerz/ipn", PaymentController.sslCommerzIpn);


router.get("/my-payments", auth(Role.USER), PaymentController.getMyPayments);
router.get("/all-payments", auth(Role.ADMIN), PaymentController.getAllPayments);
router.get("/:paymentId", auth(Role.USER, Role.ADMIN), PaymentController.getSinglePayment);

export const PaymentRoutes = router;
