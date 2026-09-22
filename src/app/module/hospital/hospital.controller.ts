import type { Request, Response } from "express";
import httpStatus from "http-status";
import type { RequestUser } from "../../middleware/checkAuth";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import { HospitalService } from "./hospital.service";

const createHospital = catchAsync(async (req: Request, res: Response) => {
	const admin = req.user as RequestUser;
	const result = await HospitalService.createHospital(req.body, admin.userId);
	sendResponse(res, {
		statusCode: httpStatus.CREATED,
		success: true,
		message: "Hospital added successfully",
		data: result,
	});
});

const getAllHospitals = catchAsync(async (req: Request, res: Response) => {
	const result = await HospitalService.getAllHospitals(req.query);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Hospitals fetched successfully",
		data: result.data,
		meta: result.meta,
	});
});

const getSingleHospital = catchAsync(async (req: Request, res: Response) => {
	const hospitalId = Array.isArray(req.params.hospitalId)
		? req.params.hospitalId[0]
		: req.params.hospitalId;
	const result = await HospitalService.getSingleHospital(hospitalId as string);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Hospital fetched successfully",
		data: result,
	});
});

const updateHospital = catchAsync(async (req: Request, res: Response) => {
	const hospitalId = Array.isArray(req.params.hospitalId)
		? req.params.hospitalId[0]
		: req.params.hospitalId;
	const result = await HospitalService.updateHospital(hospitalId as string, req.body);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Hospital updated successfully",
		data: result,
	});
});

const softDeleteHospital = catchAsync(async (req: Request, res: Response) => {
	const admin = req.user as RequestUser;
	const hospitalId = Array.isArray(req.params.hospitalId)
		? req.params.hospitalId[0]
		: req.params.hospitalId;
	const result = await HospitalService.softDeleteHospital(hospitalId as string, admin.userId);
	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Hospital removed successfully",
		data: result,
	});
});

export const HospitalController = {
	createHospital,
	getAllHospitals,
	getSingleHospital,
	updateHospital,
	softDeleteHospital,
};
