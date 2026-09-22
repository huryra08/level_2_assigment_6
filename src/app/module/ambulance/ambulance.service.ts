import httpStatus from "http-status";
import { writeAuditLog } from "../../lib/auditLog";
import { prisma } from "../../lib/prisma";
import type { IQuery } from "../../interfaces";
import { AppError } from "../../utils/AppError";
import { buildMeta, buildPagination } from "../../utils/pagination";
import type { ICreateAmbulancePayload, IUpdateAmbulancePayload } from "./ambulance.interface";
import { Prisma } from "../../../../prisma/generated/prisma/client";

const createAmbulance = async (payload: ICreateAmbulancePayload, adminId: string) => {
	const existing = await prisma.ambulance.findUnique({ where: { plateNumber: payload.plateNumber } });
	if (existing) {
		throw new AppError(httpStatus.CONFLICT, "An ambulance with this plate number already exists");
	}

	if (payload.driverId) {
		const driver = await prisma.driverProfile.findUnique({ where: { id: payload.driverId } });
		if (!driver || driver.isDeleted) {
			throw new AppError(httpStatus.NOT_FOUND, "Driver not found");
		}
	}

	const ambulance = await prisma.ambulance.create({
		data: {
			plateNumber: payload.plateNumber,
			type: payload.type,
			homeHospitalId: payload.homeHospitalId,
			driverId: payload.driverId,
		},
		include: { driver: { include: { user: { omit: { password: true } } } }, homeHospital: true },
	});

	await writeAuditLog({
		actorId: adminId,
		action: "CREATE",
		entityType: "Ambulance",
		entityId: ambulance.id,
		message: `Ambulance ${ambulance.plateNumber} added to fleet`,
	});

	return ambulance;
};

const getAllAmbulances = async (query: IQuery) => {
	const { page, limit, skip, sortBy, sortOrder } = buildPagination(query);

	const where: Prisma.AmbulanceWhereInput = { isDeleted: false };

	if (query.status) where.status = query.status as any;
	if (query.type) where.type = query.type as any;
	if (query.searchTerm) {
		where.plateNumber = { contains: query.searchTerm as string, mode: "insensitive" };
	}

	const [ambulances, total] = await Promise.all([
		prisma.ambulance.findMany({
			where,
			take: limit,
			skip,
			orderBy: { [sortBy]: sortOrder },
			include: { driver: { include: { user: { omit: { password: true } } } }, homeHospital: true },
		}),
		prisma.ambulance.count({ where }),
	]);

	return { data: ambulances, meta: buildMeta(page, limit, total) };
};

const getSingleAmbulance = async (id: string) => {
	const ambulance = await prisma.ambulance.findUnique({
		where: { id },
		include: { driver: { include: { user: { omit: { password: true } } } }, homeHospital: true },
	});

	if (!ambulance || ambulance.isDeleted) {
		throw new AppError(httpStatus.NOT_FOUND, "Ambulance not found");
	}

	return ambulance;
};

const updateAmbulance = async (id: string, payload: IUpdateAmbulancePayload) => {
	const ambulance = await prisma.ambulance.findUnique({ where: { id } });
	if (!ambulance || ambulance.isDeleted) {
		throw new AppError(httpStatus.NOT_FOUND, "Ambulance not found");
	}

	return prisma.ambulance.update({
		where: { id },
		data: payload,
		include: { driver: { include: { user: { omit: { password: true } } } }, homeHospital: true },
	});
};

const softDeleteAmbulance = async (id: string, adminId: string) => {
	const ambulance = await prisma.ambulance.findUnique({ where: { id } });
	if (!ambulance || ambulance.isDeleted) {
		throw new AppError(httpStatus.NOT_FOUND, "Ambulance not found");
	}

	const updated = await prisma.ambulance.update({
		where: { id },
		data: { isDeleted: true, deletedAt: new Date(), status: "OUT_OF_SERVICE" },
	});

	await writeAuditLog({
		actorId: adminId,
		action: "DELETE",
		entityType: "Ambulance",
		entityId: id,
		message: `Ambulance ${ambulance.plateNumber} removed from fleet`,
	});

	return updated;
};

export const AmbulanceService = {
	createAmbulance,
	getAllAmbulances,
	getSingleAmbulance,
	updateAmbulance,
	softDeleteAmbulance,
};
