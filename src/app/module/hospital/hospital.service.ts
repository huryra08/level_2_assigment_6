import httpStatus from "http-status";
import { writeAuditLog } from "../../lib/auditLog";
import { prisma } from "../../lib/prisma";
import type { IQuery } from "../../interfaces";
import { AppError } from "../../utils/AppError";
import { buildMeta, buildPagination } from "../../utils/pagination";
import { Prisma } from "../../../../prisma/generated/prisma/client";

const createHospital = async (payload: Prisma.HospitalCreateInput, adminId: string) => {
	const hospital = await prisma.hospital.create({ data: payload });

	await writeAuditLog({
		actorId: adminId,
		action: "CREATE",
		entityType: "Hospital",
		entityId: hospital.id,
		message: `Hospital "${hospital.name}" added`,
	});

	return hospital;
};

const getAllHospitals = async (query: IQuery) => {
	const { page, limit, skip, sortBy, sortOrder } = buildPagination(query);

	const where: Prisma.HospitalWhereInput = { isDeleted: false };

	if (query.isActive !== undefined) where.isActive = query.isActive === "true";
	if (query.searchTerm) {
		where.OR = [
			{ name: { contains: query.searchTerm as string, mode: "insensitive" } },
			{ address: { contains: query.searchTerm as string, mode: "insensitive" } },
		];
	}

	const [hospitals, total] = await Promise.all([
		prisma.hospital.findMany({ where, take: limit, skip, orderBy: { [sortBy]: sortOrder } }),
		prisma.hospital.count({ where }),
	]);

	return { data: hospitals, meta: buildMeta(page, limit, total) };
};

const getSingleHospital = async (id: string) => {
	const hospital = await prisma.hospital.findUnique({ where: { id } });
	if (!hospital || hospital.isDeleted) {
		throw new AppError(httpStatus.NOT_FOUND, "Hospital not found");
	}
	return hospital;
};

const updateHospital = async (id: string, payload: Prisma.HospitalUpdateInput) => {
	const hospital = await prisma.hospital.findUnique({ where: { id } });
	if (!hospital || hospital.isDeleted) {
		throw new AppError(httpStatus.NOT_FOUND, "Hospital not found");
	}

	return prisma.hospital.update({ where: { id }, data: payload });
};

const softDeleteHospital = async (id: string, adminId: string) => {
	const hospital = await prisma.hospital.findUnique({ where: { id } });
	if (!hospital || hospital.isDeleted) {
		throw new AppError(httpStatus.NOT_FOUND, "Hospital not found");
	}

	const updated = await prisma.hospital.update({
		where: { id },
		data: { isDeleted: true, deletedAt: new Date(), isActive: false },
	});

	await writeAuditLog({
		actorId: adminId,
		action: "DELETE",
		entityType: "Hospital",
		entityId: id,
		message: `Hospital "${hospital.name}" removed`,
	});

	return updated;
};

export const HospitalService = {
	createHospital,
	getAllHospitals,
	getSingleHospital,
	updateHospital,
	softDeleteHospital,
};
