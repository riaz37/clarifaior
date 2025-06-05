import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '../common/services/config.service';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RefreshTokenStrategy } from './strategies/refresh-token.strategy';
import { RefreshTokenGuard } from './guards/refresh-token.guard';
import { EmailService } from '../common/services/email.service';

@Module({
  imports: [
    PassportModule,
    // JWT Module for access tokens
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        secret: configService.jwtSecret,
        signOptions: {
          expiresIn: configService.jwtExpiresIn,
        },
      }),
      inject: [ConfigService],
    }),
    // JWT Module for refresh tokens
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        secret: configService.refreshSecret,
        signOptions: {
          expiresIn: configService.refreshExpiresIn,
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    LocalStrategy,
    JwtStrategy,
    RefreshTokenStrategy,
    RefreshTokenGuard,
    ConfigService,
    EmailService,
  ],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
