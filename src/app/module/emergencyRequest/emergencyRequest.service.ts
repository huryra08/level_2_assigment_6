import httpStatus from "http-status";
//import type { Prisma, RequestStatus } from "../../../generated/prisma";
import { writeAuditLog } from "../../lib/auditLog";
import { createNotification } from "../../lib/notify";
import { prisma } from "../../lib/prisma";
import type { IQuery } from "../../interfaces";
import { AppError } from "../../utils/AppError";
import { buildMeta, buildPagination } from "../../utils/pagination";
import type {
	IAssignAmbulancePayload,
	ICancelRequestPayload,
	ICreateEmergencyRequestPayload,
	IUpdateStatusPayload,
} from "./emergencyRequest.interface";
import { Prisma, RequestStatus } from "../../../../prisma/generated/prisma/client";

const INCLUDE = {
	caller: { select: { id: true, name: true, email: true, phone: true } },
	driver: { include: { user: { select: { id: true, name: true, phone: true } } } },
	ambulance: true,
	hospital: true,
	payment: true,
} satisfies Prisma.EmergencyRequestInclude;


const ALLOWED_TRANSITIONS: Record<string, RequestStatus[]> = {
	ASSIGNED: ["DRIVER_EN_ROUTE"] as any,
	DRIVER_EN_ROUTE: ["ARRIVED_AT_PICKUP"] as any,
	ARRIVED_AT_PICKUP: ["PATIENT_ONBOARD"] as any,
	PATIENT_ONBOARD: ["EN_ROUTE_TO_HOSPITAL"] as any,
	EN_ROUTE_TO_HOSPITAL: ["ARRIVED_AT_HOSPITAL"] as any,
	ARRIVED_AT_HOSPITAL: ["COMPLETED"] as any,
};

const TIMESTAMP_FIELD_BY_STATUS: Record<string, string> = {
	DRIVER_EN_ROUTE: "driverEnRouteAt",
	ARRIVED_AT_PICKUP: "arrivedAtPickupAt",
	PATIENT_ONBOARD: "patientOnboardAt",
	EN_ROUTE_TO_HOSPITAL: "enRouteToHospitalAt",
	ARRIVED_AT_HOSPITAL: "arrivedAtHospitalAt",
	COMPLETED: "completedAt",
};

const createRequest = async (callerId: string, payload: ICreateEmergencyRequestPayload) => {
	const request = await prisma.emergencyRequest.create({
		data: { callerId, ...payload },
		include: INCLUDE,
	});

	await writeAuditLog({
		actorId: callerId,
		action: "CREATE",
		entityType: "EmergencyRequest",
		entityId: request.id,
		message: `Emergency request created (priority: ${request.priority})`,
	});

	return request;
};

const getAllRequests = async (query: IQuery) => {
	const { page, limit, skip, sortBy, sortOrder } = buildPagination(query);

	const where: Prisma.EmergencyRequestWhereInput = { isDeleted: false };

	if (query.status) where.status = query.status as any;
	if (query.priority) where.priority = query.priority as any;
	if (query.searchTerm) {
		where.OR = [
			{ patientName: { contains: query.searchTerm as string, mode: "insensitive" } },
			{ patientPhone: { contains: query.searchTerm as string, mode: "insensitive" } },
			{ pickupAddress: { contains: query.searchTerm as string, mode: "insensitive" } },
		];
	}

	const [requests, total] = await Promise.all([
		prisma.emergencyRequest.findMany({
			where,
			take: limit,
			skip,
			orderBy: { [sortBy]: sortOrder },
			include: INCLUDE,
		}),
		prisma.emergencyRequest.count({ where }),
	]);

	return { data: requests, meta: buildMeta(page, limit, total) };
};

const getMyRequests = async (callerId: string, query: IQuery) => {
	const { page, limit, skip, sortBy, sortOrder } = buildPagination(query);

	const where: Prisma.EmergencyRequestWhereInput = { callerId, isDeleted: false };
	if (query.status) where.status = query.status as any;

	const [requests, total] = await Promise.all([
		prisma.emergencyRequest.findMany({
			where,
			take: limit,
			skip,
			orderBy: { [sortBy]: sortOrder },
			include: INCLUDE,
		}),
		prisma.emergencyRequest.count({ where }),
	]);

	return { data: requests, meta: buildMeta(page, limit, total) };
};

const getDriverAssignedRequests = async (userId: string) => {
	const driver = await prisma.driverProfile.findUnique({ where: { userId } });
	if (!driver) throw new AppError(httpStatus.NOT_FOUND, "Driver profile not found");

	return prisma.emergencyRequest.findMany({
		where: {
			driverId: driver.id,
			status: { notIn: ["COMPLETED", "CANCELLED"] },
			isDeleted: false,
		},
		orderBy: { createdAt: "desc" },
		include: INCLUDE,
	});
};

const getSingleRequest = async (id: string) => {
	const request = await prisma.emergencyRequest.findUnique({ where: { id }, include: INCLUDE });
	if (!request || request.isDeleted) {
		throw new AppError(httpStatus.NOT_FOUND, "Emergency request not found");
	}
	return request;
};


const assignAmbulance = async (
	requestId: string,
	adminId: string,
	payload: IAssignAmbulancePayload,
) => {
	const result = await prisma.$transaction(async (tx) => {
		const ambulance = await tx.ambulance.findUnique({
			where: { id: payload.ambulanceId },
			include: { driver: true },
		});

		if (!ambulance || ambulance.isDeleted) {
			throw new AppError(httpStatus.NOT_FOUND, "Ambulance not found");
		}
		if (!ambulance.driver) {
			throw new AppError(httpStatus.BAD_REQUEST, "Ambulance has no driver assigned to it");
		}

		
		const requestUpdate = await tx.emergencyRequest.updateMany({
			where: { id: requestId, status: "REQUESTED", isDeleted: false },
			data: {
				status: "ASSIGNED",
				ambulanceId: ambulance.id,
				driverId: ambulance.driver.id,
				assignedById: adminId,
				assignedAt: new Date(),
			},
		});

		if (requestUpdate.count === 0) {
			throw new AppError(
				httpStatus.CONFLICT,
				"This request is no longer awaiting dispatch (already assigned or cancelled)",
			);
		}

		
		const ambulanceUpdate = await tx.ambulance.updateMany({
			where: { id: ambulance.id, status: "AVAILABLE" },
			data: { status: "ON_TRIP" },
		});

		if (ambulanceUpdate.count === 0) {
			throw new AppError(
				httpStatus.CONFLICT,
				"This ambulance was just claimed by another dispatch. Please pick another one.",
			);
		}

		
		const driverUpdate = await tx.driverProfile.updateMany({
			where: { id: ambulance.driver.id, availability: "AVAILABLE" },
			data: { availability: "ON_TRIP" },
		});

		if (driverUpdate.count === 0) {
			throw new AppError(
				httpStatus.CONFLICT,
				"This driver was just assigned elsewhere. Please pick another ambulance.",
			);
		}

		return tx.emergencyRequest.findUniqueOrThrow({ where: { id: requestId }, include: INCLUDE });
	});

	await createNotification({
		userId: result.callerId,
		type: "REQUEST_ASSIGNED",
		title: "Ambulance dispatched",
		message: `Ambulance ${result.ambulance?.plateNumber} is on the way to ${result.pickupAddress}.`,
	});

	if (result.driver) {
		await createNotification({
			userId: result.driver.userId,
			type: "REQUEST_ASSIGNED",
			title: "New trip assigned",
			message: `You have been assigned to emergency request #${result.id}.`,
		});
	}

	await writeAuditLog({
		actorId: adminId,
		action: "ASSIGN",
		entityType: "EmergencyRequest",
		entityId: requestId,
		message: `Ambulance ${result.ambulance?.plateNumber} dispatched to request`,
		meta: { ambulanceId: payload.ambulanceId },
	});

	return result;
};


const updateStatus = async (
	requestId: string,
	actor: { userId: string; role: string },
	payload: IUpdateStatusPayload,
) => {
	const request = await prisma.emergencyRequest.findUnique({
		where: { id: requestId },
		include: { driver: true },
	});

	if (!request || request.isDeleted) {
		throw new AppError(httpStatus.NOT_FOUND, "Emergency request not found");
	}

	if (actor.role === "DRIVER") {
		const driver = await prisma.driverProfile.findUnique({ where: { userId: actor.userId } });
		if (!driver || request.driverId !== driver.id) {
			throw new AppError(httpStatus.FORBIDDEN, "You are not assigned to this request");
		}
	}

	const allowedNext = ALLOWED_TRANSITIONS[request.status] || [];
	if (!allowedNext.includes(payload.status as RequestStatus)) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			`Cannot move request from ${request.status} to ${payload.status}`,
		);
	}

	if (payload.status === "EN_ROUTE_TO_HOSPITAL" && !payload.hospitalId) {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"hospitalId is required when moving to EN_ROUTE_TO_HOSPITAL (hospital selection step)",
		);
	}

	const timestampField = TIMESTAMP_FIELD_BY_STATUS[payload.status];

	const data: Prisma.EmergencyRequestUpdateInput = {
		status: payload.status as RequestStatus,
		...(timestampField ? { [timestampField]: new Date() } : {}),
		...(payload.hospitalId ? { hospitalId: payload.hospitalId } : {}),
		...(payload.distanceKm !== undefined ? { distanceKm: payload.distanceKm } : {}),
		...(payload.fareAmount !== undefined ? { fareAmount: payload.fareAmount } : {}),
	};

	const updated = await prisma.$transaction(async (tx) => {
		const result = await tx.emergencyRequest.update({ where: { id: requestId }, data, include: INCLUDE });

		
		if (payload.status === "COMPLETED") {
			if (result.ambulanceId) {
				await tx.ambulance.update({ where: { id: result.ambulanceId }, data: { status: "AVAILABLE" } });
			}
			if (result.driverId) {
				await tx.driverProfile.update({ where: { id: result.driverId }, data: { availability: "AVAILABLE" } });
			}

			const fare = payload.fareAmount ?? result.fareAmount ?? 500;

			await tx.payment.upsert({
				where: { emergencyRequestId: result.id },
				update: {},
				create: {
					emergencyRequestId: result.id,
					merchantInvoiceNumber: result.id,
					amount: fare,
					gateway: "BKASH",
					status: "PENDING",
				},
			});
		}

		return result;
	});

	await createNotification({
		userId: updated.callerId,
		type: "REQUEST_STATUS_UPDATED",
		title: "Trip update",
		message: `Your emergency request status is now: ${updated.status.replaceAll("_", " ")}`,
	});

	await writeAuditLog({
		actorId: actor.userId,
		action: "STATUS_CHANGE",
		entityType: "EmergencyRequest",
		entityId: requestId,
		message: `Status changed from ${request.status} to ${payload.status}`,
	});

	return updated;
};

const cancelRequest = async (
	requestId: string,
	actor: { userId: string; role: string },
	payload: ICancelRequestPayload,
) => {
	const request = await prisma.emergencyRequest.findUnique({ where: { id: requestId } });

	if (!request || request.isDeleted) {
		throw new AppError(httpStatus.NOT_FOUND, "Emergency request not found");
	}

	if (["COMPLETED", "CANCELLED"].includes(request.status)) {
		throw new AppError(httpStatus.BAD_REQUEST, `Cannot cancel a request that is already ${request.status}`);
	}

	if (actor.role === "USER" && request.callerId !== actor.userId) {
		throw new AppError(httpStatus.FORBIDDEN, "You can only cancel your own requests");
	}

	const updated = await prisma.$transaction(async (tx) => {
		const result = await tx.emergencyRequest.update({
			where: { id: requestId },
			data: {
				status: "CANCELLED",
				cancelledById: actor.userId,
				cancelReason: payload.cancelReason,
				cancelledAt: new Date(),
			},
			include: INCLUDE,
		});

		if (result.ambulanceId) {
			await tx.ambulance.update({ where: { id: result.ambulanceId }, data: { status: "AVAILABLE" } });
		}
		if (result.driverId) {
			await tx.driverProfile.update({ where: { id: result.driverId }, data: { availability: "AVAILABLE" } });
		}

		return result;
	});

	await createNotification({
		userId: updated.callerId,
		type: "REQUEST_CANCELLED",
		title: "Request cancelled",
		message: `Emergency request #${updated.id} was cancelled. Reason: ${payload.cancelReason}`,
	});

	await writeAuditLog({
		actorId: actor.userId,
		action: "STATUS_CHANGE",
		entityType: "EmergencyRequest",
		entityId: requestId,
		message: `Request cancelled: ${payload.cancelReason}`,
	});

	return updated;
};

export const EmergencyRequestService = {
	createRequest,
	getAllRequests,
	getMyRequests,
	getDriverAssignedRequests,
	getSingleRequest,
	assignAmbulance,
	updateStatus,
	cancelRequest,
};
