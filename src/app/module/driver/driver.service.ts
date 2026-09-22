import bcrypt from "bcryptjs";
import httpStatus from "http-status";

import config from "../../config";
import { writeAuditLog } from "../../lib/auditLog";
import { createNotification } from "../../lib/notify";
import { prisma } from "../../lib/prisma";
import type { IQuery } from "../../interfaces";
import { AppError } from "../../utils/AppError";
import { buildMeta, buildPagination } from "../../utils/pagination";
import type {
	ICreateDriverPayload,
	IUpdateAvailabilityPayload,
	IUpdateDriverPayload,
	IUpdateLocationPayload,
	IVerifyDriverPayload,
} from "./driver.interface";
import { AuthProvider, DriverAvailability, Role, UserStatus } from "../../../../prisma/generated/prisma/enums";
import { Prisma } from "../../../../prisma/generated/prisma/client";
import { deleteFromCloudinary, extractPublicIdFromUrl, uploadBufferToCloudinary } from "../../lib/cloudinary";

/**
 * ADMIN creates a driver account: a User (role=DRIVER) plus its
 * DriverProfile, in a single transaction.
 */
const createDriver = async (payload: ICreateDriverPayload) => {
	const email = payload.email.trim().toLowerCase();

	const existingUser = await prisma.user.findUnique({ where: { email } });
	if (existingUser) {
		throw new AppError(httpStatus.CONFLICT, "A user with this email already exists");
	}

	const existingLicense = await prisma.driverProfile.findUnique({
		where: { licenseNumber: payload.licenseNumber },
	});
	if (existingLicense) {
		throw new AppError(httpStatus.CONFLICT, "This license number is already registered");
	}

	const hashedPassword = await bcrypt.hash(payload.password, Number(config.bcrypt_salt_rounds));

	const driver = await prisma.$transaction(async (tx) => {
		const user = await tx.user.create({
			data: {
				name: payload.name,
				email,
				phone: payload.phone,
				password: hashedPassword,
				role: Role.DRIVER,
				status: UserStatus.ACTIVE,
				emailVerified: true,
				authProvider: AuthProvider.CREDENTIAL,
			},
		});

		return tx.driverProfile.create({
			data: {
				userId: user.id,
				licenseNumber: payload.licenseNumber,
				yearsOfExperience: payload.yearsOfExperience ?? 0,
			},
			include: { user: { omit: { password: true } } },
		});
	});

	await writeAuditLog({
		action: "CREATE",
		entityType: "DriverProfile",
		entityId: driver.id,
		message: `Driver account created for ${email}`,
	});

	return driver;
};

const getAllDrivers = async (query: IQuery) => {
	const { page, limit, skip, sortBy, sortOrder } = buildPagination(query);

	const where: Prisma.DriverProfileWhereInput = { isDeleted: false };

	if (query.verificationStatus) {
		where.verificationStatus = query.verificationStatus as any;
	}
	if (query.availability) {
		where.availability = query.availability as any;
	}
	if (query.searchTerm) {
		where.OR = [
			{ licenseNumber: { contains: query.searchTerm as string, mode: "insensitive" } },
			{ user: { name: { contains: query.searchTerm as string, mode: "insensitive" } } },
			{ user: { email: { contains: query.searchTerm as string, mode: "insensitive" } } },
		];
	}

	const [drivers, total] = await Promise.all([
		prisma.driverProfile.findMany({
			where,
			take: limit,
			skip,
			orderBy: { [sortBy]: sortOrder },
			include: { user: { omit: { password: true } }, ambulance: true },
		}),
		prisma.driverProfile.count({ where }),
	]);

	return { data: drivers, meta: buildMeta(page, limit, total) };
};

const getSingleDriver = async (driverId: string) => {
	const driver = await prisma.driverProfile.findUnique({
		where: { id: driverId },
		include: { user: { omit: { password: true } }, ambulance: true },
	});

	if (!driver || driver.isDeleted) {
		throw new AppError(httpStatus.NOT_FOUND, "Driver not found");
	}

	return driver;
};

const getMyDriverProfile = async (userId: string) => {
	const driver = await prisma.driverProfile.findUnique({
		where: { userId },
		include: { user: { omit: { password: true } }, ambulance: true },
	});

	if (!driver) {
		throw new AppError(httpStatus.NOT_FOUND, "Driver profile not found");
	}

	return driver;
};

const updateDriver = async (driverId: string, payload: IUpdateDriverPayload) => {
	const driver = await prisma.driverProfile.findUnique({ where: { id: driverId } });
	if (!driver || driver.isDeleted) {
		throw new AppError(httpStatus.NOT_FOUND, "Driver not found");
	}

	return prisma.driverProfile.update({
		where: { id: driverId },
		data: payload,
		include: { user: { omit: { password: true } } },
	});
};

const verifyDriver = async (driverId: string, adminId: string, payload: IVerifyDriverPayload) => {
	const driver = await prisma.driverProfile.findUnique({
		where: { id: driverId },
		include: { user: true },
	});

	if (!driver || driver.isDeleted) {
		throw new AppError(httpStatus.NOT_FOUND, "Driver not found");
	}

	const updated = await prisma.driverProfile.update({
		where: { id: driverId },
		data: {
			verificationStatus: payload.verificationStatus,
			rejectionReason: payload.verificationStatus === "REJECTED" ? payload.rejectionReason : null,
			reviewedById: adminId,
			reviewedAt: new Date(),
		},
	});

	await createNotification({
		userId: driver.userId,
		type: "DRIVER_VERIFICATION",
		title: `Driver application ${payload.verificationStatus.toLowerCase()}`,
		message:
			payload.verificationStatus === "APPROVED"
				? "Your driver application has been approved. You can now go online."
				: `Your driver application was rejected. Reason: ${payload.rejectionReason || "N/A"}`,
	});

	await writeAuditLog({
		actorId: adminId,
		action: "STATUS_CHANGE",
		entityType: "DriverProfile",
		entityId: driverId,
		message: `Driver verification set to ${payload.verificationStatus}`,
	});

	return updated;
};

const updateMyAvailability = async (userId: string, payload: IUpdateAvailabilityPayload) => {
	const driver = await prisma.driverProfile.findUnique({ where: { userId } });
	if (!driver || driver.isDeleted) {
		throw new AppError(httpStatus.NOT_FOUND, "Driver profile not found");
	}

	if (driver.verificationStatus !== "APPROVED") {
		throw new AppError(httpStatus.FORBIDDEN, "Driver is not yet verified by admin");
	}

	const hasActiveTrip = await prisma.emergencyRequest.findFirst({
		where: {
			driverId: driver.id,
			isDeleted: false,
			status: {
				notIn: ["COMPLETED", "CANCELLED"],
			},
		},
		select: { id: true },
	});

	if (driver.availability === "ON_TRIP" && hasActiveTrip && payload.availability !== "ON_TRIP") {
		throw new AppError(
			httpStatus.BAD_REQUEST,
			"Cannot change availability while on an active trip",
		);
	}

	return prisma.driverProfile.update({
		where: { userId },
		data: { availability: payload.availability as DriverAvailability },
	});
};

const updateMyLocation = async (userId: string, payload: IUpdateLocationPayload) => {
	const driver = await prisma.driverProfile.findUnique({ where: { userId }, include: { ambulance: true } });
	if (!driver || driver.isDeleted) {
		throw new AppError(httpStatus.NOT_FOUND, "Driver profile not found");
	}

	await prisma.driverProfile.update({
		where: { userId },
		data: { currentLat: payload.lat, currentLng: payload.lng, locationUpdatedAt: new Date() },
	});

	if (driver.ambulance) {
		await prisma.ambulance.update({
			where: { id: driver.ambulance.id },
			data: { currentLat: payload.lat, currentLng: payload.lng, locationUpdatedAt: new Date() },
		});
	}

	return { lat: payload.lat, lng: payload.lng };
};

const softDeleteDriver = async (driverId: string, adminId: string) => {
	const driver = await prisma.driverProfile.findUnique({ where: { id: driverId } });
	if (!driver || driver.isDeleted) {
		throw new AppError(httpStatus.NOT_FOUND, "Driver not found");
	}

	const updated = await prisma.driverProfile.update({
		where: { id: driverId },
		data: { isDeleted: true, deletedAt: new Date(), availability: "OFFLINE" },
	});

	await prisma.user.update({
		where: { id: driver.userId },
		data: { isDeleted: true, deletedAt: new Date(), status: UserStatus.DELETED },
	});

	await writeAuditLog({
		actorId: adminId,
		action: "DELETE",
		entityType: "DriverProfile",
		entityId: driverId,
		message: "Driver soft-deleted",
	});

	return updated;
};

const updateMyLicensePhoto = async (userId: string, file?: Express.Multer.File) => {
	if (!file) {
		throw new AppError(httpStatus.BAD_REQUEST, "No image file was uploaded");
	}

	const driver = await prisma.driverProfile.findUnique({ where: { userId } });

	if (!driver || driver.isDeleted) {
		throw new AppError(httpStatus.NOT_FOUND, "Driver profile not found");
	}

	const uploadResult = await uploadBufferToCloudinary(file.buffer, {
		folder: "ambulance-dispatch/license-photos",
		publicId: driver.id,
	});

	const previousLicensePhoto = driver.licensePhoto;
	if (previousLicensePhoto) {
		const oldPublicId = extractPublicIdFromUrl(previousLicensePhoto);
		if (oldPublicId && oldPublicId !== uploadResult.public_id) {
			await deleteFromCloudinary(oldPublicId);
		}
	}

	// Re-uploading a license photo re-opens verification: an admin should
	// review the new document before the driver counts as verified again.
	const updated = await prisma.driverProfile.update({
		where: { userId },
		data: {
			licensePhoto: uploadResult.secure_url,
			verificationStatus: "PENDING",
			rejectionReason: null,
		},
		include: { user: { omit: { password: true } } },
	});

	await writeAuditLog({
		actorId: userId,
		action: "UPDATE",
		entityType: "DriverProfile",
		entityId: driver.id,
		message: "Driver uploaded a new license photo; verification reset to PENDING",
	});

	return updated;
};

export const DriverService = {
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
