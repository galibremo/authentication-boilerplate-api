import { Module } from '@nestjs/common';
import { EmailTemplateRepository } from './email-template.repository';
import { EmailTemplateService } from './email-template.service';
import { EmailTemplatesController } from './email-templates.controller';

@Module({
	controllers: [EmailTemplatesController],
	providers: [EmailTemplateService, EmailTemplateRepository],
	exports: [EmailTemplateService],
})
export class EmailTemplateModule {}
