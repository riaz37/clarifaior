import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  ValidationPipe,
  BadRequestException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import { AuthResponse } from '@repo/types';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body(ValidationPipe) registerDto: RegisterDto,
  ): Promise<AuthResponse> {
    return this.authService.register(registerDto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body(ValidationPipe) loginDto: LoginDto): Promise<AuthResponse> {
    return this.authService.login(loginDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@CurrentUser() user: any) {
    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        isEmailVerified: user.isEmailVerified,
      },
    };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body('refresh_token') refreshToken: string) {
    if (!refreshToken) {
      throw new BadRequestException('Refresh token is required');
    }
    return this.authService.refreshToken(refreshToken);
  }
}
