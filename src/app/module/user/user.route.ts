import { Router } from "express";
//import { Role } from "../../../generated/prisma";
import { auth } from "../../middleware/checkAuth";
import { validateRequest } from "../../middleware/validateRequest";
import { UserController } from "./user.controller";
import { UserValidation } from "./user.validation";
import { Role } from "../../../../prisma/generated/prisma/enums";
import { upload } from "../../middleware/upload";

const router = Router();

router.patch(
	"/me",
	auth(Role.USER, Role.DRIVER, Role.ADMIN),
	validateRequest(UserValidation.UpdateProfileZodSchema),
	UserController.updateMyProfile,
);

router.get(
	"/me/notifications",
	auth(Role.USER, Role.DRIVER, Role.ADMIN),
	UserController.getMyNotifications,
);

router.patch(
	"/me/notifications/:notificationId/read",
	auth(Role.USER, Role.DRIVER, Role.ADMIN),
	UserController.markNotificationRead,
);



// ...
router.patch(
	"/me/avatar",
	auth(Role.USER, Role.DRIVER, Role.ADMIN),
	upload.single("avatar"),
	UserController.updateMyProfile,
);

export const UserRoutes = router;
