import { Injectable, type OnModuleInit } from '@nestjs/common';
import { SystemRepository } from './system.repository';
import type { SystemSettingsSchemaType } from '../../database/types';

@Injectable()
export class SystemService implements OnModuleInit {
	constructor(private readonly systemRepository: SystemRepository) {}

	async onModuleInit() {
		try {
			await this.systemRepository.initializeSchema();
		} catch (error) {
			console.error('Failed to initialize database system schema:', error);
		}

		const settings = await this.systemRepository.getSettings();
		if (!settings) {
			await this.systemRepository.createSettings({
				accessModel: 'OPEN',
				allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'USER'],
			});
		}
	}

	async getSettings(): Promise<SystemSettingsSchemaType> {
		const settings = await this.systemRepository.getSettings();
		if (!settings) {
			return this.systemRepository.createSettings({
				accessModel: 'OPEN',
				allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'USER'],
			});
		}
		return settings;
	}

	async updateSettings(data: {
		accessModel?: 'OPEN' | 'APPROVAL_BASED' | 'CLOSED';
		allowedRoles?: string[];
	}): Promise<SystemSettingsSchemaType> {
		const settings = await this.getSettings();
		return this.systemRepository.updateSettings(settings.id, data);
	}
}
