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
}
