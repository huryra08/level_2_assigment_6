import type { Request, Response } from "express";
import httpStatus from "http-status";
import type { RequestUser } from "../../middleware/checkAuth";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { EmergencyRequestService } from "./emergencyRequest.service";

const createRequest = catchAsync(async (req: Request, res: Response) => {
	const user = req.user as RequestUser;
	const result = await EmergencyRequestService.createRequest(user.userId, req.body);
	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Emergency request submitted. Help is on the way.",
		data: result,
	});
});

const getAllRequests = catchAsync(async (req: Request, res: Response) => {
	const result = await EmergencyRequestService.getAllRequests(req.query);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Emergency requests fetched successfully",
		data: result.data,
		meta: result.meta,
	});
});

const getMyRequests = catchAsync(async (req: Request, res: Response) => {
	const user = req.user as RequestUser;
	const result = await EmergencyRequestService.getMyRequests(user.userId, req.query);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Your requests fetched successfully",
		data: result.data,
		meta: result.meta,
	});
});

const getDriverAssignedRequests = catchAsync(async (req: Request, res: Response) => {
	const user = req.user as RequestUser;
	const result = await EmergencyRequestService.getDriverAssignedRequests(user.userId);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Assigned requests fetched successfully",
		data: result,
	});
});

const getSingleRequest = catchAsync(async (req: Request, res: Response) => {
	const requestId = Array.isArray(req.params.requestId) ? req.params.requestId[0] : req.params.requestId;

	if (!requestId) {
		return sendResponse(res, {
			statusCode: httpStatus.BAD_REQUEST,
			success: false,
			message: "Invalid request ID",
			data: null,
		});
	}

	const result = await EmergencyRequestService.getSingleRequest(requestId);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Emergency request fetched successfully",
		data: result,
	});
});

const assignAmbulance = catchAsync(async (req: Request, res: Response) => {
	const admin = req.user as RequestUser;
	const requestId = Array.isArray(req.params.requestId) ? req.params.requestId[0] : req.params.requestId;

	if (!requestId) {
		return sendResponse(res, {
			statusCode: httpStatus.BAD_REQUEST,
			success: false,
			message: "Invalid request ID",
			data: null,
		});
	}

	const result = await EmergencyRequestService.assignAmbulance(requestId, admin.userId, req.body);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Ambulance dispatched successfully",
		data: result,
	});
});

const updateStatus = catchAsync(async (req: Request, res: Response) => {
	const user = req.user as RequestUser;
	const requestId = Array.isArray(req.params.requestId) ? req.params.requestId[0] : req.params.requestId;

	if (!requestId) {
		return sendResponse(res, {
			statusCode: httpStatus.BAD_REQUEST,
			success: false,
			message: "Invalid request ID",
			data: null,
		});
	}

	const result = await EmergencyRequestService.updateStatus(requestId, user, req.body);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Request status updated successfully",
		data: result,
	});
});

const cancelRequest = catchAsync(async (req: Request, res: Response) => {
	const user = req.user as RequestUser;
	const requestId = Array.isArray(req.params.requestId) ? req.params.requestId[0] : req.params.requestId;

	if (!requestId) {
		return sendResponse(res, {
			statusCode: httpStatus.BAD_REQUEST,
			success: false,
			message: "Invalid request ID",
			data: null,
		});
	}

	const result = await EmergencyRequestService.cancelRequest(requestId, user, req.body);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Request cancelled successfully",
		data: result,
	});
});

export const EmergencyRequestController = {
	createRequest,
	getAllRequests,
	getMyRequests,
	getDriverAssignedRequests,
	getSingleRequest,
	assignAmbulance,
	updateStatus,
	cancelRequest,
};
