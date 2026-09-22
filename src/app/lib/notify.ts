
import { NotificationType } from "../../../prisma/generated/prisma/enums";
import { prisma } from "./prisma";

interface ICreateNotification {
	userId: string;
	type: NotificationType;
	title: string;
	message: string;
	meta?: Record<string, unknown>;
}

export const createNotification = async (payload: ICreateNotification) => {
	try {
		await prisma.notification.create({
			data: {
				userId: payload.userId,
				type: payload.type,
				title: payload.title,
				message: payload.message,
				meta: payload.meta ? (payload.meta as any) : undefined,
			},
		});
	} catch (error) {
		console.error("Failed to create notification:", error);
	}
};
