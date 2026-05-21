import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DiscoveryModule } from '@nestjs/core';
import { AppController } from './app.controller';
import { AuthModule } from './app/auth/auth.module';
import { CsrfModule } from './app/csrf/csrf.module';
import { MediaModule } from './app/media/media.module';
import { UsersModule } from './app/users/users.module';
import { SystemModule } from './app/system/system.module';
import { validateEnv } from './core/validators/env';
import { CryptoModule } from './crypto/crypto.module';
import { DatabaseModule } from './database/database.module';

@Module({
	imports: [
		ConfigModule.forRoot({
			isGlobal: true,
			validate: validateEnv,
		}),
		DiscoveryModule,
		CryptoModule,
		CsrfModule,
		DatabaseModule,
		AuthModule,
		MediaModule,
		UsersModule,
		SystemModule,
	],
	controllers: [AppController],
	providers: [],
})
export class AppModule {}
