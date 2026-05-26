import { Controller, Get, HttpStatus, Query, UseGuards } from '@nestjs/common';

import { Roles } from '../../core/decorators/roles.decorator';
import { RolesGuard } from '../../core/guards/roles.guard';
import { ApiResponse, createApiResponse } from '../../core/interceptors/api-response.interceptor';
import { ZodValidationPipe } from '../../core/pipes/zod-validation.pipe';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuditLogFilterOptionsResponse, AuditLogListResponse } from './audit-log.mapper';
import { auditLogListQuerySchema, type AuditLogListQueryDto } from './audit-log.schema';
import { AuditLogService } from './audit-log.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('audit-logs')
export class AuditLogController {
	constructor(private readonly auditLogService: AuditLogService) {}

	@Get('filter-options')
	async getFilterOptions(): Promise<ApiResponse<AuditLogFilterOptionsResponse>> {
		const options = await this.auditLogService.getFilterOptions();

		return createApiResponse(HttpStatus.OK, 'Audit log filter options fetched successfully', options);
	}

	@Get()
	async listAuditLogs(
		@Query(new ZodValidationPipe(auditLogListQuerySchema)) query: AuditLogListQueryDto,
	): Promise<ApiResponse<AuditLogListResponse>> {
		const logs = await this.auditLogService.listAuditLogs(query);

		return createApiResponse(HttpStatus.OK, 'Audit logs fetched successfully', logs);
	}
}
