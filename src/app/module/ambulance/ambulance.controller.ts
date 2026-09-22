import type { Request, Response } from "express";
import httpStatus from "http-status";
import type { RequestUser } from "../../middleware/checkAuth";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { AmbulanceService } from "./ambulance.service";

const createAmbulance = catchAsync(async (req: Request, res: Response) => {
	const admin = req.user as RequestUser;
	const result = await AmbulanceService.createAmbulance(req.body, admin.userId);
	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Ambulance added to fleet successfully",
		data: result,
	});
});

const getAllAmbulances = catchAsync(async (req: Request, res: Response) => {
	const result = await AmbulanceService.getAllAmbulances(req.query);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Ambulances fetched successfully",
		data: result.data,
		meta: result.meta,
	});
});

const getSingleAmbulance = catchAsync(async (req: Request, res: Response) => {
	const ambulanceId = req.params.ambulanceId as string;
	const result = await AmbulanceService.getSingleAmbulance(ambulanceId);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Ambulance fetched successfully",
		data: result,
	});
});

const updateAmbulance = catchAsync(async (req: Request, res: Response) => {
	const ambulanceId = req.params.ambulanceId as string;
	const result = await AmbulanceService.updateAmbulance(ambulanceId, req.body);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Ambulance updated successfully",
		data: result,
	});
});

const softDeleteAmbulance = catchAsync(async (req: Request, res: Response) => {
	const admin = req.user as RequestUser;
	const ambulanceId = req.params.ambulanceId as string;
	const result = await AmbulanceService.softDeleteAmbulance(ambulanceId, admin.userId);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Ambulance removed successfully",
		data: result,
	});
});

export const AmbulanceController = {
	createAmbulance,
	getAllAmbulances,
	getSingleAmbulance,
	updateAmbulance,
	softDeleteAmbulance,
};
