import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { EnvType } from '../../../core/validators/env';
import { TEMPLATE_KEYS } from '../../email-template/email-template.registry';
import { EmailDispatcherService } from '../../smtp/email-dispatcher.service';

interface SendApprovalEmailParams {
	email: string;
	name?: string | null;
	approvedByName?: string | null;
}

@Injectable()
export class ApprovalEmailService {
	private readonly logger = new Logger(ApprovalEmailService.name);

	constructor(
		private readonly emailDispatcher: EmailDispatcherService,
		private readonly configService: ConfigService<EnvType, true>,
	) {}

	async sendApprovalEmail(params: SendApprovalEmailParams): Promise<void> {
		try {
			const appUrl = this.configService.get('APP_URL', { infer: true });

			await this.emailDispatcher.sendFromTemplate({
				templateKey: TEMPLATE_KEYS.AUTH_ACCOUNT_APPROVAL,
				to: [{ email: params.email, name: params.name ?? undefined }],
				params: {
					name: params.name ?? 'there',
					approvedByName: params.approvedByName ?? 'an administrator',
					appUrl,
					year: new Date().getFullYear(),
				},
			});
		} catch (error) {
			this.logger.warn(`Failed to send approval email: ${this.getErrorMessage(error)}`);
		}
	}

	private getErrorMessage(error: unknown): string {
		return error instanceof Error ? error.message : 'Unknown error';
	}
}
