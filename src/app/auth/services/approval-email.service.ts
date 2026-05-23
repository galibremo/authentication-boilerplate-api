import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { EnvType } from '../../../core/validators/env';
import { BrevoService } from '../../brevo/brevo.service';

interface SendApprovalEmailParams {
	email: string;
	name?: string | null;
	approvedByName?: string | null;
}

const approvalTemplateKey = 'auth_account_approval';

@Injectable()
export class ApprovalEmailService {
	private readonly logger = new Logger(ApprovalEmailService.name);

	constructor(
		private readonly brevoService: BrevoService,
		private readonly configService: ConfigService<EnvType, true>,
	) {}

	async sendApprovalEmail(params: SendApprovalEmailParams): Promise<void> {
		try {
			await this.brevoService.sendFromTemplate({
				templateKey: approvalTemplateKey,
				to: [{ email: params.email, name: params.name ?? undefined }],
				params: {
					name: params.name ?? 'there',
					approvedByName: params.approvedByName ?? 'an administrator',
					appUrl: this.configService.get('APP_URL', { infer: true }),
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
