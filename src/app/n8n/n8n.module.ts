import { Module } from '@nestjs/common';
import { N8nController } from './n8n.controller';
import { N8NRepository } from './n8n.repository';
import { N8nService } from './n8n.service';

@Module({
	controllers: [N8nController],
	providers: [N8nService, N8NRepository],
})
export class N8nModule {}
