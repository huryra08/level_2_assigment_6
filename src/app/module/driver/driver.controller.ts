import type { Request, Response } from "express";
import httpStatus from "http-status";
import type { RequestUser } from "../../middleware/checkAuth";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { DriverService } from "./driver.service";

const createDriver = catchAsync(async (req: Request, res: Response) => {
	const result = await DriverService.createDriver(req.body);
	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Driver account created successfully",
		data: result,
	});
});

const getAllDrivers = catchAsync(async (req: Request, res: Response) => {
	const result = await DriverService.getAllDrivers(req.query);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Drivers fetched successfully",
		data: result.data,
		meta: result.meta,
	});
});

const getSingleDriver = catchAsync(async (req: Request, res: Response) => {
	const driverId = req.params.driverId;

	if (typeof driverId !== "string" || driverId.trim() === "") {
		return sendResponse(res, {
			statusCode: httpStatus.BAD_REQUEST,
			success: false,
			message: "Driver ID is required",
			data: undefined
		});
	}

	const result = await DriverService.getSingleDriver(driverId);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Driver fetched successfully",
		data: result,
	});
});

const getMyDriverProfile = catchAsync(async (req: Request, res: Response) => {
	const user = req.user as RequestUser;
	const result = await DriverService.getMyDriverProfile(user.userId);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Driver profile fetched successfully",
		data: result,
	});
});

const updateDriver = catchAsync(async (req: Request, res: Response) => {
	const driverId = req.params.driverId;

	if (typeof driverId !== "string" || driverId.trim() === "") {
		return sendResponse(res, {
			statusCode: httpStatus.BAD_REQUEST,
			success: false,
			message: "Driver ID is required",
			data: undefined,
		});
	}

	const result = await DriverService.updateDriver(driverId, req.body);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Driver updated successfully",
		data: result,
	});
});

const verifyDriver = catchAsync(async (req: Request, res: Response) => {
	const admin = req.user as RequestUser;
	const driverId = req.params.driverId;

	if (typeof driverId !== "string" || driverId.trim() === "") {
		return sendResponse(res, {
			statusCode: httpStatus.BAD_REQUEST,
			success: false,
			message: "Driver ID is required",
			data: undefined,
		});
	}

	const result = await DriverService.verifyDriver(driverId, admin.userId, req.body);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Driver verification updated successfully",
		data: result,
	});
});

const updateMyAvailability = catchAsync(async (req: Request, res: Response) => {
	const user = req.user as RequestUser;
	const result = await DriverService.updateMyAvailability(user.userId, req.body);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Availability updated successfully",
		data: result,
	});
});

const updateMyLocation = catchAsync(async (req: Request, res: Response) => {
	const user = req.user as RequestUser;
	const result = await DriverService.updateMyLocation(user.userId, req.body);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Location updated successfully",
		data: result,
	});
});

const softDeleteDriver = catchAsync(async (req: Request, res: Response) => {
	const admin = req.user as RequestUser;
	const driverId = req.params.driverId;

	if (typeof driverId !== "string" || driverId.trim() === "") {
		return sendResponse(res, {
			statusCode: httpStatus.BAD_REQUEST,
			success: false,
			message: "Driver ID is required",
			data: undefined,
		});
	}

	const result = await DriverService.softDeleteDriver(driverId, admin.userId);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Driver deleted successfully",
		data: result,
	});
});

const updateMyLicensePhoto = catchAsync(async (req: Request, res: Response) => {
	const user = req.user as RequestUser;
	const result = await DriverService.updateMyLicensePhoto(user.userId, req.file);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "License photo updated successfully. Verification status reset to pending review.",
		data: result,
	});
});

export const DriverController = {
	createDriver,
	getAllDrivers,
	getSingleDriver,
	getMyDriverProfile,
	updateDriver,
	verifyDriver,
	updateMyAvailability,
	updateMyLocation,
	softDeleteDriver,
	updateMyLicensePhoto,
};
