import httpStatus from "http-status";
//import type { Prisma, UserStatus } from "../../../generated/prisma";
import { writeAuditLog } from "../../lib/auditLog";
import { prisma } from "../../lib/prisma";
import type { IQuery } from "../../interfaces";
import { AppError } from "../../utils/AppError";
import { buildMeta, buildPagination } from "../../utils/pagination";
import { Prisma, UserStatus } from "../../../../prisma/generated/prisma/client";

const getDashboardStats = async () => {
	const [
		totalUsers,
		totalDrivers,
		totalAmbulances,
		availableAmbulances,
		totalHospitals,
		requestsByStatus,
		requestsByPriority,
		totalCompletedTrips,
		revenueAgg,
		pendingDriverVerifications,
	] = await Promise.all([
		prisma.user.count({ where: { role: "USER", isDeleted: false } }),
		prisma.user.count({ where: { role: "DRIVER", isDeleted: false } }),
		prisma.ambulance.count({ where: { isDeleted: false } }),
		prisma.ambulance.count({ where: { isDeleted: false, status: "AVAILABLE" } }),
		prisma.hospital.count({ where: { isDeleted: false } }),
		prisma.emergencyRequest.groupBy({
			by: ["status"],
			_count: { _all: true },
			where: { isDeleted: false },
		}),
		prisma.emergencyRequest.groupBy({
			by: ["priority"],
			_count: { _all: true },
			where: { isDeleted: false, status: { notIn: ["COMPLETED", "CANCELLED"] } },
		}),
		prisma.emergencyRequest.count({ where: { status: "COMPLETED" } }),
		prisma.payment.aggregate({ where: { status: "PAID" }, _sum: { amount: true } }),
		prisma.driverProfile.count({ where: { verificationStatus: "PENDING", isDeleted: false } }),
	]);

	return {
		totalUsers,
		totalDrivers,
		totalAmbulances,
		availableAmbulances,
		totalHospitals,
		totalCompletedTrips,
		totalRevenue: revenueAgg._sum.amount || 0,
		pendingDriverVerifications,
		requestsByStatus: requestsByStatus.map((r) => ({ status: r.status, count: r._count._all })),
		activeRequestsByPriority: requestsByPriority.map((r) => ({
			priority: r.priority,
			count: r._count._all,
		})),
	};
};

const getAuditLogs = async (query: IQuery) => {
	const { page, limit, skip, sortBy, sortOrder } = buildPagination(query);

	const where: Prisma.AuditLogWhereInput = {};
	if (query.entityType) where.entityType = query.entityType as string;
	if (query.action) where.action = query.action as any;
	if (query.actorId) where.actorId = query.actorId as string;

	const [logs, total] = await Promise.all([
		prisma.auditLog.findMany({
			where,
			take: limit,
			skip,
			orderBy: { [sortBy]: sortOrder },
			include: { actor: { select: { id: true, name: true, email: true, role: true } } },
		}),
		prisma.auditLog.count({ where }),
	]);

	return { data: logs, meta: buildMeta(page, limit, total) };
};

const getAllUsers = async (query: IQuery) => {
	const { page, limit, skip, sortBy, sortOrder } = buildPagination(query);

	const where: Prisma.UserWhereInput = { isDeleted: false };
	if (query.role) where.role = query.role as any;
	if (query.status) where.status = query.status as any;
	if (query.searchTerm) {
		where.OR = [
			{ name: { contains: query.searchTerm as string, mode: "insensitive" } },
			{ email: { contains: query.searchTerm as string, mode: "insensitive" } },
		];
	}

	const [users, total] = await Promise.all([
		prisma.user.findMany({
			where,
			take: limit,
			skip,
			orderBy: { [sortBy]: sortOrder },
			omit: { password: true },
		}),
		prisma.user.count({ where }),
	]);

	return { data: users, meta: buildMeta(page, limit, total) };
};

const updateUserStatus = async (userId: string, status: UserStatus, adminId: string) => {
	const user = await prisma.user.findUnique({ where: { id: userId } });
	if (!user || user.isDeleted) {
		throw new AppError(httpStatus.NOT_FOUND, "User not found");
	}
	if (user.role === "ADMIN") {
		throw new AppError(httpStatus.FORBIDDEN, "Admin accounts cannot be blocked through this endpoint");
	}

	const updated = await prisma.user.update({
		where: { id: userId },
		data: { status },
		omit: { password: true },
	});

	await writeAuditLog({
		actorId: adminId,
		action: "UPDATE",
		entityType: "User",
		entityId: userId,
		message: `User status changed to ${status}`,
	});

	return updated;
};

export const AdminService = {
	getDashboardStats,
	getAuditLogs,
	getAllUsers,
	updateUserStatus,
};
