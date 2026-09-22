import type { Request, Response } from "express";
import httpStatus from "http-status";
import type { RequestUser } from "../../middleware/checkAuth";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { NotificationService } from "./notification.service";

const getMyNotifications = catchAsync(async (req: Request, res: Response) => {
	const user = req.user as RequestUser;
	const result = await NotificationService.getMyNotifications(user.userId, req.query);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Notifications fetched successfully",
		data: { notifications: result.data, unreadCount: result.unreadCount },
		meta: result.meta,
	});
});

const markAsRead = catchAsync(async (req: Request, res: Response) => {
	const user = req.user as RequestUser;
	const notificationId = Array.isArray(req.params.notificationId)
		? req.params.notificationId[0]
		: req.params.notificationId;

	if (!notificationId) {
		return sendResponse(res, {
			statusCode: httpStatus.BAD_REQUEST,
			success: false,
			message: "Invalid notification id",
			data: null,
		});
	}

	const result = await NotificationService.markAsRead(user.userId, notificationId);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Notification marked as read",
		data: result,
	});
});

const markAllAsRead = catchAsync(async (req: Request, res: Response) => {
	const user = req.user as RequestUser;
	await NotificationService.markAllAsRead(user.userId);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "All notifications marked as read",
		data: null,
	});
});

export const NotificationController = {
	getMyNotifications,
	markAsRead,
	markAllAsRead,
};
