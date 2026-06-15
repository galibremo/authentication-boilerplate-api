import { Module } from '@nestjs/common';

import { AuditLogModule } from '../audit-log/audit-log.module';
import { AuthModule } from '../auth/auth.module';
import { KnowledgeBaseService } from './knowledge-base.service';
import { KnowledgeBaseRepository } from './knowledge-base.repository';
import { KnowledgeBaseController } from './knowledge-base.controller';

@Module({
	imports: [AuthModule, AuditLogModule],
	controllers: [KnowledgeBaseController],
	providers: [KnowledgeBaseService, KnowledgeBaseRepository],
})
export class KnowledgeBaseModule {}
