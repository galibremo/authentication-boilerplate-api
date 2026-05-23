import { Injectable, Logger } from '@nestjs/common';

import { BrevoService } from '../../brevo/brevo.service';

interface SendWelcomeEmailParams {
	email: string;
	name?: string | null;
}

const welcomeTemplateKey = 'auth_welcome';

@Injectable()
export class WelcomeEmailService {
	private readonly logger = new Logger(WelcomeEmailService.name);

	constructor(private readonly brevoService: BrevoService) {}

	async sendWelcomeEmail(params: SendWelcomeEmailParams): Promise<void> {
		try {
			await this.brevoService.sendFromTemplate({
				templateKey: welcomeTemplateKey,
				to: [{ email: params.email, name: params.name ?? undefined }],
				params: {
					name: params.name ?? 'there',
					email: params.email,
					year: new Date().getFullYear(),
				},
			});
		} catch (error) {
			this.logger.warn(`Failed to send welcome email: ${this.getErrorMessage(error)}`);
		}
	}

	private getErrorMessage(error: unknown): string {
		return error instanceof Error ? error.message : 'Unknown error';
	}
}
