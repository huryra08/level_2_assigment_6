import type { Request, Response } from "express";
import httpStatus from "http-status";
import config from "../../config";
import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import type { RequestUser } from "../../middleware/checkAuth";
import { PaymentService } from "./payment.service";

const initiatePayment = catchAsync(async (req: Request, res: Response) => {
	const result = await PaymentService.initiatePayment(req.user as RequestUser, req.body);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Payment session initiated",
		data: result,
	});
});

const bkashExecute = catchAsync(async (req: Request, res: Response) => {
	const result = await PaymentService.executeBkashPaymentFlow(req.body);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "bKash payment completed successfully",
		data: result,
	});
});


const bkashCallback = catchAsync(async (req: Request, res: Response) => {
	const callbackData = {
		...req.query,
		...req.body,
	} as { paymentID?: string; status?: string; statusMessage?: string };
	const { paymentID, status, statusMessage } = callbackData;

	if (status !== "success" || !paymentID) {
		const reason = encodeURIComponent(statusMessage || status || "bKash payment was cancelled");
		return res.redirect(`${config.frontend_url}/payment/failed?reason=${reason}`);
	}

	try {
		await PaymentService.executeBkashPaymentFlow({ paymentID });
		return res.redirect(`${config.frontend_url}/payment/success`);
	} catch (error) {
		const reason = error instanceof Error ? error.message : "bKash payment execution failed";
		console.error(`bKash callback execution failed for ${paymentID}:`, error);
		return res.redirect(`${config.frontend_url}/payment/failed?reason=${encodeURIComponent(reason)}`);
	}
});

const sslCommerzSuccess = catchAsync(async (req: Request, res: Response) => {
	await PaymentService.handleSslCommerzIpn(req.body);
	res.redirect(`${config.frontend_url}/payment/success`);
});

const sslCommerzIpn = catchAsync(async (req: Request, res: Response) => {
	await PaymentService.handleSslCommerzIpn(req.body);
	res.status(httpStatus.OK).json({ success: true });
});

const sslCommerzFail = catchAsync(async (req: Request, res: Response) => {
	await PaymentService.handleSslCommerzFailOrCancel(req.body.tran_id, "FAILED");
	res.redirect(`${config.frontend_url}/payment/failed`);
});

const sslCommerzCancel = catchAsync(async (req: Request, res: Response) => {
	await PaymentService.handleSslCommerzFailOrCancel(req.body.tran_id, "CANCELLED");
	res.redirect(`${config.frontend_url}/payment/cancelled`);
});

const getMyPayments = catchAsync(async (req: Request, res: Response) => {
	const result = await PaymentService.getMyPayments(req.user as RequestUser, req.query);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "My payments fetched successfully",
		data: result.data,
		meta: result.meta,
	});
});

const getAllPayments = catchAsync(async (req: Request, res: Response) => {
	const result = await PaymentService.getAllPayments(req.query);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "All payments fetched successfully",
		data: result.data,
		meta: result.meta,
	});
});

const getSinglePayment = catchAsync(async (req: Request, res: Response) => {
	const paymentId = Array.isArray(req.params.paymentId)
		? req.params.paymentId[0]
		: req.params.paymentId;

	if (!paymentId) {
		return sendResponse(res, {
			statusCode: httpStatus.BAD_REQUEST,
			success: false,
			message: "Payment id is required",
			data: undefined
		});
	}

	const result = await PaymentService.getSinglePayment(paymentId, req.user as RequestUser);

	sendResponse(res, {
		statusCode: httpStatus.OK,
		success: true,
		message: "Payment fetched successfully",
		data: result,
	});
});

export const PaymentController = {
	initiatePayment,
	bkashExecute,
	bkashCallback,
	sslCommerzSuccess,
	sslCommerzIpn,
	sslCommerzFail,
	sslCommerzCancel,
	getMyPayments,
	getAllPayments,
	getSinglePayment,
};
