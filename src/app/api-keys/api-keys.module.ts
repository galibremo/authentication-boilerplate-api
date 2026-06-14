import { Module } from '@nestjs/common';

import { AuditLogModule } from '../audit-log/audit-log.module';
import { AuthModule } from '../auth/auth.module';
import { ApiKeysController } from './api-keys.controller';
import { ApiKeysRepository } from './api-keys.repository';
import { ApiKeysService } from './api-keys.service';

@Module({
	imports: [AuthModule, AuditLogModule],
	controllers: [ApiKeysController],
	providers: [ApiKeysService, ApiKeysRepository],
})
export class ApiKeysModule {}
