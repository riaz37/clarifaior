import { Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';

@Injectable()
export class ConfigService {
  constructor(private readonly configService: NestConfigService) {}

  get<T = string>(key: string, defaultValue?: T): T {
    return this.configService.get(key, defaultValue) as T;
  }

  get isProduction(): boolean {
    return this.get('NODE_ENV') === 'production';
  }

  get databaseUrl(): string {
    return this.get<string>('DATABASE_URL');
  }

  get jwtSecret(): string {
    return this.get<string>('JWT_SECRET');
  }

  get jwtExpiresIn(): string | number {
    return this.get<string | number>('JWT_EXPIRES_IN', '1d');
  }

  get refreshSecret(): string {
    return this.get<string>('JWT_REFRESH_SECRET');
  }

  get refreshExpiresIn(): string | number {
    return this.get<string | number>('JWT_REFRESH_EXPIRES_IN', '7d');
  }

  get smtpHost(): string {
    return this.get('SMTP_HOST');
  }

  get smtpPort(): number {
    return parseInt(this.get('SMTP_PORT') || '587', 10);
  }

  get smtpUser(): string {
    return this.get('SMTP_USER');
  }

  get smtpPass(): string {
    return this.get('SMTP_PASS');
  }

  get smtpFromEmail(): string {
    return this.get('SMTP_FROM_EMAIL');
  }

  get smtpFromName(): string {
    return this.get('SMTP_FROM_NAME');
  }

  get frontendUrl(): string {
    return this.get('FRONTEND_URL');
  }
}
