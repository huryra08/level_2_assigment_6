import type { Request, Response } from "express";
import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import type { RequestUser } from "../../middleware/checkAuth";
import { UserService } from "./user.service";

const updateMyProfile = catchAsync(async (req: Request, res: Response) => {
	const user = req.user as RequestUser;
	const result = await UserService.updateMyProfile(user.userId, req.body);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Profile updated successfully",
		data: result,
	});
});

const getMyNotifications = catchAsync(async (req: Request, res: Response) => {
	const user = req.user as RequestUser;
	const result = await UserService.getMyNotifications(user.userId);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Notifications fetched successfully",
		data: result,
	});
});

const markNotificationRead = catchAsync(async (req: Request, res: Response) => {
	const user = req.user as RequestUser;
	const notificationId = Array.isArray(req.params.notificationId)
		? req.params.notificationId[0] ?? ""
		: req.params.notificationId ?? "";
	const result = await UserService.markNotificationRead(user.userId, notificationId);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Notification marked as read",
		data: result,
	});
});

const updateMyAvatar = catchAsync(async (req: Request, res: Response) => {
	const user = req.user as RequestUser;
	const result = await UserService.updateMyAvatar(user.userId, req.file);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Avatar updated successfully",
		data: result,
	});
});

export const UserController = {
	updateMyProfile,
	updateMyAvatar,
	getMyNotifications,
	markNotificationRead,
};
