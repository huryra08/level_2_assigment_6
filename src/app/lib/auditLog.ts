import { AuditAction } from "../../../prisma/generated/prisma/enums";
import { prisma } from "./prisma";

interface IWriteAuditLog {
	actorId?: string | null;
	action: AuditAction;
	entityType: string;
	entityId?: string | null;
	message: string;
	meta?: Record<string, unknown>;
}


export const writeAuditLog = async (payload: IWriteAuditLog) => {
	try {
		await prisma.auditLog.create({
			data: {
				actorId: payload.actorId ?? null,
				action: payload.action,
				entityType: payload.entityType,
				entityId: payload.entityId ?? null,
				message: payload.message,
				meta: payload.meta ? (payload.meta as any) : undefined,
			},
		});
	} catch (error) {
	
		console.error("Failed to write audit log:", error);
	}
};
