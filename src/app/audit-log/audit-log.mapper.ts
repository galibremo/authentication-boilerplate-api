import type { RoleTypeEnum } from '../../database/types';

export interface AuditLogRow {
	publicId: string;
	actorPublicId: string | null;
	actorRole: RoleTypeEnum | null;
	action: string;
	targetType: string;
	targetId: string;
	metadata: Record<string, unknown>;
	ipAddress: string | null;
	userAgent: string | null;
	createdAt: Date;
	updatedAt: Date;
}

export interface AuditLogResponse {
	id: string;
	actorId: string | null;
	actorRole: RoleTypeEnum | null;
	action: string;
	targetType: string;
	targetId: string;
	metadata: Record<string, unknown>;
	ipAddress: string | null;
	userAgent: string | null;
	createdAt: Date;
	updatedAt: Date;
}

export interface AuditLogListResponse {
	rows: AuditLogResponse[];
	total: number;
	page: number;
	pageSize: number;
}

export function mapAuditLogResponse(row: AuditLogRow): AuditLogResponse {
	return {
		id: row.publicId,
		actorId: row.actorPublicId,
		actorRole: row.actorRole,
		action: row.action,
		targetType: row.targetType,
		targetId: row.targetId,
		metadata: row.metadata,
		ipAddress: row.ipAddress,
		userAgent: row.userAgent,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}
