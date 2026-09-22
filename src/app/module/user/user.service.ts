import httpStatus from "http-status";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../utils/AppError";
import { deleteFromCloudinary, extractPublicIdFromUrl, uploadBufferToCloudinary } from "../../lib/cloudinary";

const updateMyProfile = async (userId: string, payload: { name?: string; phone?: string }) => {
	const user = await prisma.user.update({
		where: { id: userId },
		data: payload,
		omit: { password: true },
	});

	return user;
};

const getMyNotifications = async (userId: string) => {
	return prisma.notification.findMany({
		where: { userId },
		orderBy: { createdAt: "desc" },
		take: 50,
	});
};

const markNotificationRead = async (userId: string, notificationId: string) => {
	const notification = await prisma.notification.findUnique({ where: { id: notificationId } });

	if (!notification || notification.userId !== userId) {
		throw new AppError(httpStatus.NOT_FOUND, "Notification not found");
	}

	return prisma.notification.update({
		where: { id: notificationId },
		data: { isRead: true },
	});
};

const updateMyAvatar = async (userId: string, file?: Express.Multer.File) => {
	if (!file) {
		throw new AppError(httpStatus.BAD_REQUEST, "No image file was uploaded");
	}

	const existingUser = await prisma.user.findUnique({ where: { id: userId } });

	if (!existingUser) {
		throw new AppError(httpStatus.NOT_FOUND, "User not found");
	}

	const uploadResult = await uploadBufferToCloudinary(file.buffer, {
		folder: "ambulance-dispatch/avatars",
		publicId: userId,
	});

	
	const existingProfileImage = (existingUser as typeof existingUser & { profileImage?: string | null }).profileImage;
	if (existingProfileImage) {
		const oldPublicId = extractPublicIdFromUrl(existingProfileImage);
		if (oldPublicId && oldPublicId !== uploadResult.public_id) {
			await deleteFromCloudinary(oldPublicId);
		}
	}

	return prisma.user.update({
		where: { id: userId },
		data: { profileImage: uploadResult.secure_url },
		omit: { password: true },
	});
};

export const UserService = {
	updateMyProfile,
	updateMyAvatar,
	getMyNotifications,
	markNotificationRead,
};
