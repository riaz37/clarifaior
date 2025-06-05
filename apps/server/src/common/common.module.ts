import { Module, Global } from '@nestjs/common';
import { APP_INTERCEPTOR, APP_FILTER, APP_PIPE } from '@nestjs/core';

// Services
import { ValidationService } from './services/validation.service';
import { EncryptionService } from './services/encryption.service';
import { LoggerService } from './services/logger.service';
import { PrismaService } from './services/prisma.service';
import { ConfigService } from './services/config.service';

// Interceptors
import { LoggingInterceptor } from './interceptors/logging.interceptor';

// Filters
import { HttpExceptionFilter } from './filters/http-exception.filter';

// Pipes
import { CustomValidationPipe } from './pipes/validation.pipe';

@Global()
@Module({
  providers: [
    // Services
    ValidationService,
    EncryptionService,
    LoggerService,
    PrismaService,
    ConfigService,

    // Global interceptors
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },

    // Global filters
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },

    // Global pipes
    {
      provide: APP_PIPE,
      useClass: CustomValidationPipe,
    },
  ],
  exports: [
    PrismaService,
    ValidationService,
    EncryptionService,
    LoggerService,
    ConfigService,
  ],
})
export class CommonModule {}
