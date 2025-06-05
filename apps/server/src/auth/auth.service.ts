import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { PrismaService } from '@common/services/prisma.service';
import { AuthResponse, JwtPayload, RefreshTokenResponse } from '@repo/types';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ValidationService } from '@common/services/validation.service';
import { LoggerService } from '@common/services/logger.service';

@Injectable()
export class AuthService {
  private readonly JWT_ACCESS_SECRET: string;
  private readonly JWT_REFRESH_SECRET: string;
  private readonly JWT_EXPIRES_IN: number;
  private readonly JWT_REFRESH_EXPIRES_IN: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly validationService: ValidationService,
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
  ) {
    this.JWT_ACCESS_SECRET =
      this.configService.get<string>('JWT_ACCESS_SECRET') ||
      'default-access-secret';

    this.JWT_REFRESH_SECRET =
      this.configService.get<string>('JWT_REFRESH_SECRET') ||
      'default-refresh-secret';

    this.JWT_EXPIRES_IN = Number(
      this.configService.get<string>('JWT_EXPIRES_IN') || '900',
    );

    this.JWT_REFRESH_EXPIRES_IN =
      Number(this.configService.get<string>('JWT_REFRESH_EXPIRES_IN')) || 86400;
    this.logger.setContext('AuthService');
  }

  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    const { email, password, first_name, last_name } = registerDto;

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user and workspace in a transaction
    const result = await this.prisma.$transaction(async (prisma) => {
      // Create user
      const user = await prisma.user.create({
        data: {
          email,
          first_name,
          last_name: last_name || null,
          password_hash: hashedPassword,
          is_active: true,
          email_verified: false,
          role: 'user',
          preferences: {},
        },
      });

      // Create workspace
      const workspace = await prisma.workspace.create({
        data: {
          name: `${user.first_name}'s Workspace`,
          slug: this.validationService.generateSlug(
            `${user.first_name}'s Workspace`,
          ),
          owner_id: user.id,
        },
      });

      // Add user as workspace owner
      await prisma.workspaceMember.create({
        data: {
          workspace_id: workspace.id,
          user_id: user.id,
          role: 'owner',
          is_active: true,
          joined_at: new Date(),
        },
      });

      return { user, workspace };
    });

    const { user, workspace } = result;

    this.logger.log(
      `User registered successfully: ${email} with workspace: ${workspace.slug}`,
    );

    // Generate tokens
    const tokens = await this.generateTokens({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    // Store refresh token in database
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    // Map user to response format
    const userResponse = {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      avatar: user.avatar,
      email_verified: user.email_verified,
      role: user.role,
      is_active: user.is_active,
      preferences: user.preferences,
      created_at: user.created_at,
      updated_at: user.updated_at,
    };

    return {
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      expires_in: this.JWT_EXPIRES_IN,
      user: userResponse,
    };
  }

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const { email, password } = loginDto;

    this.logger.log(`Login attempt for email: ${email}`);

    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: {
        email: loginDto.email,
      },
    });

    if (!user) {
      this.logger.warn(`Login failed - user not found: ${email}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if password is correct
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      this.logger.warn(`Login failed - invalid password for user: ${email}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user is active
    if (!user.is_active) {
      this.logger.warn(`Login failed - user account is inactive: ${email}`);
      throw new UnauthorizedException('Account is inactive');
    }

    // Generate tokens
    const tokens = await this.generateTokens({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    // Store refresh token in database
    await this.storeRefreshToken(user.id, tokens.refreshToken);

    // Map user to response format
    const userResponse = {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      avatar: user.avatar,
      email_verified: user.email_verified,
      role: user.role,
      is_active: user.is_active,
      preferences: user.preferences,
      created_at: user.created_at,
      updated_at: user.updated_at,
    };

    return {
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      expires_in: this.JWT_EXPIRES_IN,
      user: userResponse,
    };
  }

  async validateUserById(userId: string): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        avatar: true,
        email_verified: true,
        role: true,
        is_active: true,
        preferences: true,
        created_at: true,
        updated_at: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  private async generateTokens(payload: JwtPayload): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.JWT_ACCESS_SECRET,
        expiresIn: this.JWT_EXPIRES_IN,
      }),
      this.jwtService.signAsync(payload, {
        secret: this.JWT_REFRESH_SECRET,
        expiresIn: this.JWT_REFRESH_EXPIRES_IN,
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async storeRefreshToken(
    userId: string,
    token: string,
  ): Promise<void> {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + this.JWT_REFRESH_EXPIRES_IN * 1000);

    await this.prisma.refreshToken.create({
      data: {
        user_id: userId,
        token: hashedToken,
        expires_at: expiresAt,
      },
    });
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { email: forgotPasswordDto.email },
    });

    if (!user) {
      // Don't reveal that the user doesn't exist
      return;
    }

    // Generate a reset token
    const resetToken = crypto.randomUUID();
    const resetTokenExpires = new Date();
    resetTokenExpires.setHours(resetTokenExpires.getHours() + 1); // Token expires in 1 hour

    // Update user with reset token
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        reset_password_token: resetToken,
        reset_password_expires: resetTokenExpires,
      },
    });

    // In a real app, you would send an email here
    const resetUrl = `${this.configService.get('FRONTEND_URL')}/reset-password?token=${resetToken}`;
    this.logger.log(`Password reset link: ${resetUrl}`);
    // TODO: Send email with reset link
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<void> {
    // Find user by reset token and check if it's not expired
    const user = await this.prisma.user.findFirst({
      where: {
        reset_password_token: resetPasswordDto.token,
        reset_password_expires: {
          gte: new Date(), // Token not expired
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Invalid or expired reset token');
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(resetPasswordDto.password, salt);

    // Update user's password and clear reset token
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password_hash: hashedPassword,
        reset_password_token: null,
        reset_password_expires: null,
        updated_at: new Date(),
      },
    });

    // Invalidate all user sessions
    await this.prisma.refreshToken.updateMany({
      where: { user_id: user.id, revoked: false },
      data: { revoked: true, revoked_at: new Date() },
    });
  }

  async logout(refreshToken: string): Promise<void> {
    try {
      // Verify refresh token
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.JWT_REFRESH_SECRET,
      });

      // Hash the token
      const hashedToken = crypto
        .createHash('sha256')
        .update(refreshToken)
        .digest('hex');

      // Revoke the token
      await this.prisma.refreshToken.updateMany({
        where: {
          token: hashedToken,
          user_id: payload.sub,
          revoked: false,
        },
        data: {
          revoked: true,
          revoked_at: new Date(),
        },
      });
    } catch (error) {
      this.logger.error('Logout error:', error);
      // Don't throw error as we want to proceed even if token is invalid
    }
  }

  async refreshToken(refreshToken: string): Promise<RefreshTokenResponse> {
    try {
      // Verify the refresh token
      const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: this.JWT_REFRESH_SECRET,
      });

      // Hash the token to match how it's stored
      const hashedToken = crypto
        .createHash('sha256')
        .update(refreshToken)
        .digest('hex');

      // Find the token in the database
      const token = await this.prisma.refreshToken.findFirst({
        where: {
          token: hashedToken,
          user_id: payload.sub,
          revoked: false,
          expires_at: { gt: new Date() },
        },
      });

      if (!token) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Get the user
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Generate new tokens
      const tokens = await this.generateTokens({
        sub: user.id,
        email: user.email,
        role: user.role,
      });

      // Revoke the old refresh token
      await this.prisma.refreshToken.update({
        where: { id: token.id },
        data: {
          revoked: true,
          revoked_at: new Date(),
        },
      });

      // Store the new refresh token
      await this.storeRefreshToken(user.id, tokens.refreshToken);

      // Return the new tokens
      return {
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        expires_in: this.JWT_EXPIRES_IN,
      };
    } catch (error) {
      this.logger.error('Error refreshing token', error);
      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}
