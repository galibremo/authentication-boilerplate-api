import { Module } from '@nestjs/common';

import { AuditLogModule } from '../audit-log/audit-log.module';
import { TemplateModule } from '../template/template.module';
import { CryptoModule } from '../../crypto/crypto.module';
import { DatabaseModule } from '../../database/database.module';
import { EmailDispatcherService } from './email-dispatcher.service';
import { SmtpProvidersController } from './smtp-providers.controller';
import { SmtpProvidersRepository } from './smtp-providers.repository';
import { SmtpProvidersService } from './smtp-providers.service';

@Module({
	imports: [DatabaseModule, CryptoModule, TemplateModule, AuditLogModule],
	controllers: [SmtpProvidersController],
	providers: [SmtpProvidersRepository, SmtpProvidersService, EmailDispatcherService],
	exports: [EmailDispatcherService],
})
export class SmtpModule {}
