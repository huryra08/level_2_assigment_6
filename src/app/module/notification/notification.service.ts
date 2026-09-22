import httpStatus from "http-status";
import { prisma } from "../../lib/prisma";
import type { IQuery } from "../../interfaces";
import { AppError } from "../../utils/AppError";
import { buildMeta, buildPagination } from "../../utils/pagination";

const getMyNotifications = async (userId: string, query: IQuery) => {
	const { page, limit, skip } = buildPagination(query);

	const where = { userId, ...(query.isRead !== undefined ? { isRead: query.isRead === "true" } : {}) };

	const [notifications, total, unreadCount] = await Promise.all([
		prisma.notification.findMany({ where, take: limit, skip, orderBy: { createdAt: "desc" } }),
		prisma.notification.count({ where }),
		prisma.notification.count({ where: { userId, isRead: false } }),
	]);

	return { data: notifications, meta: buildMeta(page, limit, total), unreadCount };
};

const markAsRead = async (userId: string, notificationId: string) => {
	const notification = await prisma.notification.findUnique({ where: { id: notificationId } });

	if (!notification || notification.userId !== userId) {
		throw new AppError(httpStatus.NOT_FOUND, "Notification not found");
	}

	return prisma.notification.update({ where: { id: notificationId }, data: { isRead: true } });
};

const markAllAsRead = async (userId: string) => {
	await prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
	return null;
};

export const NotificationService = {
	getMyNotifications,
	markAsRead,
	markAllAsRead,
};
