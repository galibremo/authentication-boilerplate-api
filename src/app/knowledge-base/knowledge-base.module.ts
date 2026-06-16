import { Module } from '@nestjs/common';

import { AuditLogModule } from '../audit-log/audit-log.module';
import { AuthModule } from '../auth/auth.module';
import { MediaModule } from '../media/media.module';
import { ChromaService } from './chroma.service';
import { KnowledgeBaseService } from './knowledge-base.service';
import { KnowledgeBaseRepository } from './knowledge-base.repository';
import { KnowledgeBaseController } from './knowledge-base.controller';

@Module({
	imports: [AuthModule, AuditLogModule, MediaModule],
	controllers: [KnowledgeBaseController],
	providers: [KnowledgeBaseService, KnowledgeBaseRepository, ChromaService],
	exports: [KnowledgeBaseService],
})
export class KnowledgeBaseModule {}
