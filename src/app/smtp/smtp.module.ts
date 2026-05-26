import { forwardRef, Module } from '@nestjs/common';

import { CryptoModule } from '../../crypto/crypto.module';
import { DatabaseModule } from '../../database/database.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { TemplateModule } from '../template/template.module';
import { EmailLogsModule } from '../email-logs/email-logs.module';
import { EmailDispatcherService } from './email-dispatcher.service';
import { SmtpProvidersController } from './smtp-providers.controller';
import { SmtpProvidersRepository } from './smtp-providers.repository';
import { SmtpProvidersService } from './smtp-providers.service';

@Module({
	imports: [DatabaseModule, CryptoModule, TemplateModule, AuditLogModule, forwardRef(() => EmailLogsModule)],
	controllers: [SmtpProvidersController],
	providers: [
		SmtpProvidersRepository,
		SmtpProvidersService,
		EmailDispatcherService,
	],
	exports: [EmailDispatcherService, SmtpProvidersRepository],
})
export class SmtpModule {}
