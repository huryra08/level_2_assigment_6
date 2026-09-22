import { Role } from './../../../../prisma/generated/prisma/enums';
import { Router } from "express";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { AdminController } from "./admin.controller";
import { AdminValidation } from "./admin.validation";

const router = Router();

router.get("/dashboard-stats", auth(Role.ADMIN), AdminController.getDashboardStats);

router.get("/audit-logs", auth(Role.ADMIN), AdminController.getAuditLogs);

router.get("/users", auth(Role.ADMIN), AdminController.getAllUsers);

router.patch(
	"/users/:userId/status",
	auth(Role.ADMIN),
	validateRequest(AdminValidation.UpdateUserStatusZodSchema),
	AdminController.updateUserStatus,
);

export const AdminRoutes = router;
