import { Router } from "express";
import { auth } from "../../middleware/checkAuth";
import { NotificationController } from "./notification.controller";

const router = Router();

router.get("/", auth(), NotificationController.getMyNotifications);
router.patch("/read-all", auth(), NotificationController.markAllAsRead);
router.patch("/:notificationId/read", auth(), NotificationController.markAsRead);

export const NotificationRoutes = router;
