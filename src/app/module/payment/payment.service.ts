import httpStatus from "http-status";
import ejs from "ejs";
import path from "path";
import config from "../../config";
import {
	createBkashPayment,
	executeBkashPayment,
	queryBkashPayment,
} from "../../lib/bkash";
import { initSslCommerzPayment, validateSslCommerzPayment } from "../../lib/sslcommerz";
import { writeAuditLog } from "../../lib/auditLog";
import { createNotification } from "../../lib/notify";
import { transporter } from "../../lib/nodemailer";
import { prisma } from "../../lib/prisma";
import type { IQuery } from "../../interfaces";
import { AppError } from "../../utils/AppError";
import { buildMeta, buildPagination } from "../../utils/pagination";
import type { RequestUser } from "../../middleware/checkAuth";
import type { IBkashExecutePayload, IInitiatePaymentPayload } from "./payment.interface";
import { Prisma } from "../../../../prisma/generated/prisma/client";

const getFullTrip = async (emergencyRequestId: string) => {
	const trip = await prisma.emergencyRequest.findUnique({
		where: { id: emergencyRequestId },
		include: { caller: true, payment: true },
	});

	if (!trip || trip.isDeleted) {
		throw new AppError(httpStatus.NOT_FOUND, "Emergency request not found");
	}

	return trip;
};

const sendReceiptEmail = async (params: {
	email: string;
	name: string;
	amount: string;
	gateway: string;
	requestId: string;
	trxId: string;
}) => {
	try {
		const templatePath = path.join(process.cwd(), "src/app/templates/payment-receipt.ejs");
		const html = await ejs.renderFile(templatePath, params);
		await transporter.sendMail({
			from: config.email_sender,
			to: params.email,
			subject: "Payment Received - Emergency Ambulance Dispatch",
			html,
		});
	} catch (error) {
		console.error("Failed to send payment receipt email:", error);
	}
};


const initiatePayment = async (user: RequestUser, payload: IInitiatePaymentPayload) => {
	const trip = await getFullTrip(payload.emergencyRequestId);

	if (trip.callerId !== user.userId) {
		throw new AppError(httpStatus.FORBIDDEN, "You can only pay for your own trips");
	}

	if (trip.status !== "COMPLETED") {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			`Trip must be completed before payment. Current status: ${trip.status}`,
		);
	}

	const payment =
		trip.payment ??
		(await prisma.payment.create({
			data: {
				emergencyRequestId: trip.id,
				merchantInvoiceNumber: trip.id,
				amount: trip.fareAmount ?? 500,
				gateway: payload.gateway,
				status: "PENDING",
			},
		}));

	if (payment.status === "PAID") {
		throw new AppError(httpStatus.BAD_REQUEST, "This trip has already been paid for");
	}

	
	await prisma.payment.update({
		where: { id: payment.id },
		data: { gateway: payload.gateway, status: "PENDING", failureReason: null },
	});

	const amount = Number(payment.amount);

	if (payload.gateway === "BKASH") {
		const result = await createBkashPayment({
			amount: amount.toFixed(2),
				merchantInvoiceNumber: payment.merchantInvoiceNumber,
			callbackURL: config.bkash_callback_url,
		});

		await prisma.payment.update({
			where: { id: payment.id },
			data: {
				bkashPaymentId: result.paymentID,
				gatewayInitResponse: result,
			},
		});

		return { gateway: "BKASH" as const, bkashURL: result.bkashURL, paymentID: result.paymentID };
	}

	
	const result = await initSslCommerzPayment({
		total_amount: amount,
		tran_id: payment.merchantInvoiceNumber,
		cus_name: trip.caller.name,
		cus_email: trip.caller.email,
		cus_phone: trip.caller.phone || "01700000000",
		cus_add1: trip.pickupAddress,
	});

	await prisma.payment.update({
		where: { id: payment.id },
		data: {
			sslTranId: payment.merchantInvoiceNumber,
			gatewayInitResponse: result as unknown as Prisma.InputJsonValue,
		},
	});

	return { gateway: "SSLCOMMERZ" as const, GatewayPageURL: result.GatewayPageURL };
};


const executeBkashPaymentFlow = async (payload: IBkashExecutePayload) => {
	const payment = await prisma.payment.findUnique({
		where: { bkashPaymentId: payload.paymentID },
		include: { emergencyRequest: { include: { caller: true } } },
	});

	if (!payment) {
		throw new AppError(httpStatus.NOT_FOUND, "Payment not found for this paymentID");
	}

	const result = await executeBkashPayment(payload.paymentID);

	if (result.statusCode !== "0000" || result.transactionStatus !== "Completed") {
		await prisma.payment.update({
			where: { id: payment.id },
			data: {
				status: "FAILED",
				failureReason: result.statusMessage || "bKash execution failed",
				gatewayVerifyResponse: result,
			},
		});
		throw new AppError(httpStatus.BAD_GATEWAY, result.statusMessage || "bKash payment failed");
	}

	const updated = await prisma.payment.update({
		where: { id: payment.id },
		data: {
			status: "PAID",
			bkashTrxId: result.trxID,
			paidAt: new Date(),
			payerName: payment.emergencyRequest.caller.name,
			payerEmail: payment.emergencyRequest.caller.email,
			payerPhone: payment.emergencyRequest.caller.phone,
			gatewayVerifyResponse: result,
		},
	});

	await createNotification({
		userId: payment.emergencyRequest.callerId,
		type: "PAYMENT_RECEIVED",
		title: "Payment successful",
		message: `Payment of ${updated.amount} BDT via bKash was successful.`,
	});

	await sendReceiptEmail({
		email: payment.emergencyRequest.caller.email,
		name: payment.emergencyRequest.caller.name,
		amount: String(updated.amount),
		gateway: "bKash",
		requestId: payment.emergencyRequestId,
		trxId: result.trxID,
	});

	await writeAuditLog({
		actorId: payment.emergencyRequest.callerId,
		action: "PAYMENT",
		entityType: "Payment",
		entityId: payment.id,
		message: `bKash payment completed (trxID: ${result.trxID})`,
	});

	return updated;
};


const handleSslCommerzIpn = async (body: Record<string, any>) => {
	const { tran_id, val_id } = body;

	if (!tran_id || !val_id) {
		throw new AppError(httpStatus.BAD_REQUEST, "Missing tran_id or val_id from SSLCommerz");
	}

	const payment = await prisma.payment.findUnique({
		where: { merchantInvoiceNumber: tran_id },
		include: { emergencyRequest: { include: { caller: true } } },
	});

	if (!payment) {
		throw new AppError(httpStatus.NOT_FOUND, "Payment not found for this transaction");
	}

	const validation = await validateSslCommerzPayment(val_id);

	if (validation.status !== "VALID" && validation.status !== "VALIDATED") {
		await prisma.payment.update({
			where: { id: payment.id },
			data: {
				status: "FAILED",
				failureReason: "SSLCommerz validation failed",
				gatewayVerifyResponse: validation,
			},
		});
		throw new AppError(httpStatus.BAD_GATEWAY, "SSLCommerz transaction could not be validated");
	}

	const updated = await prisma.payment.update({
		where: { id: payment.id },
		data: {
			status: "PAID",
			sslValId: val_id,
			sslCardType: validation.card_type,
			sslBankTranId: validation.bank_tran_id,
			paidAt: new Date(),
			payerName: payment.emergencyRequest.caller.name,
			payerEmail: payment.emergencyRequest.caller.email,
			payerPhone: payment.emergencyRequest.caller.phone,
			gatewayVerifyResponse: validation,
		},
	});

	await createNotification({
		userId: payment.emergencyRequest.callerId,
		type: "PAYMENT_RECEIVED",
		title: "Payment successful",
		message: `Payment of ${updated.amount} BDT via SSLCommerz was successful.`,
	});

	await sendReceiptEmail({
		email: payment.emergencyRequest.caller.email,
		name: payment.emergencyRequest.caller.name,
		amount: String(updated.amount),
		gateway: "SSLCommerz",
		requestId: payment.emergencyRequestId,
		trxId: validation.bank_tran_id || val_id,
	});

	await writeAuditLog({
		actorId: payment.emergencyRequest.callerId,
		action: "PAYMENT",
		entityType: "Payment",
		entityId: payment.id,
		message: "SSLCommerz payment validated and completed",
	});

	return updated;
};

const handleSslCommerzFailOrCancel = async (tran_id: string, status: "FAILED" | "CANCELLED") => {
	const payment = await prisma.payment.findUnique({ where: { merchantInvoiceNumber: tran_id } });
	if (!payment) return null;

	return prisma.payment.update({
		where: { id: payment.id },
		data: { status, failureReason: `SSLCommerz redirected with status=${status}` },
	});
};

const getMyPayments = async (user: RequestUser, query: IQuery) => {
	const { page, limit, skip, sortBy, sortOrder } = buildPagination(query);

	const where: Prisma.PaymentWhereInput = {
		emergencyRequest: { callerId: user.userId },
	};

	const [payments, total] = await Promise.all([
		prisma.payment.findMany({
			where,
			take: limit,
			skip,
			orderBy: { [sortBy]: sortOrder },
			include: { emergencyRequest: { select: { id: true, pickupAddress: true, status: true } } },
		}),
		prisma.payment.count({ where }),
	]);

	return { data: payments, meta: buildMeta(page, limit, total) };
};

const getAllPayments = async (query: IQuery) => {
	const { page, limit, skip, sortBy, sortOrder } = buildPagination(query);

	const where: Prisma.PaymentWhereInput = {};
	if (query.status) where.status = query.status as any;
	if (query.gateway) where.gateway = query.gateway as any;

	const [payments, total] = await Promise.all([
		prisma.payment.findMany({
			where,
			take: limit,
			skip,
			orderBy: { [sortBy]: sortOrder },
			include: {
				emergencyRequest: {
					select: { id: true, pickupAddress: true, status: true, caller: { select: { name: true, email: true } } },
				},
			},
		}),
		prisma.payment.count({ where }),
	]);

	return { data: payments, meta: buildMeta(page, limit, total) };
};

const getSinglePayment = async (paymentId: string, user: RequestUser) => {
	const payment = await prisma.payment.findUnique({
		where: { id: paymentId },
		include: { emergencyRequest: { include: { caller: true } } },
	});

	if (!payment) throw new AppError(httpStatus.NOT_FOUND, "Payment not found");

	if (user.role === "USER" && payment.emergencyRequest.callerId !== user.userId) {
		throw new AppError(httpStatus.FORBIDDEN, "You are not allowed to view this payment");
	}

	return payment;
};

export const PaymentService = {
	initiatePayment,
	executeBkashPaymentFlow,
	handleSslCommerzIpn,
	handleSslCommerzFailOrCancel,
	getMyPayments,
	getAllPayments,
	getSinglePayment,
};
