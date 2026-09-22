import { Router } from "express";
import { auth } from "../../middleware/checkAuth";
import { emergencyRequestLimiter } from "../../middleware/rateLimiter";
import { validateRequest } from "../../middleware/validateRequest";
import { EmergencyRequestController } from "./emergencyRequest.controller";
import { EmergencyRequestValidation } from "./emergencyRequest.validation";
import { Role } from "../../../../prisma/generated/prisma/enums";

const router = Router();

router.post(
	"/",
	auth(Role.USER),
	emergencyRequestLimiter,
	validateRequest(EmergencyRequestValidation.CreateEmergencyRequestZodSchema),
	EmergencyRequestController.createRequest,
);

router.get("/", auth(Role.ADMIN), EmergencyRequestController.getAllRequests);

router.get("/my-requests", auth(Role.USER), EmergencyRequestController.getMyRequests);

router.get(
	"/driver/assigned",
	auth(Role.DRIVER),
	EmergencyRequestController.getDriverAssignedRequests,
);

router.get(
	"/:requestId",
	auth(Role.ADMIN, Role.DRIVER, Role.USER),
	EmergencyRequestController.getSingleRequest,
);

router.post(
	"/:requestId/assign",
	auth(Role.ADMIN),
	validateRequest(EmergencyRequestValidation.AssignAmbulanceZodSchema),
	EmergencyRequestController.assignAmbulance,
);

router.patch(
	"/:requestId/status",
	auth(Role.DRIVER, Role.ADMIN),
	validateRequest(EmergencyRequestValidation.UpdateStatusZodSchema),
	EmergencyRequestController.updateStatus,
);

router.patch(
	"/:requestId/cancel",
	auth(Role.USER, Role.ADMIN),
	validateRequest(EmergencyRequestValidation.CancelRequestZodSchema),
	EmergencyRequestController.cancelRequest,
);

export const EmergencyRequestRoutes = router;
