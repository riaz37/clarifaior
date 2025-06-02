import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { users, workspaces, workspaceMembers } from 'database/src/db/schema';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponse, JwtPayload } from '@repo/types';
import { DatabaseService } from '../common/services/database.service';
import { ValidationService } from '../common/services/validation.service';
import { LoggerService } from '../common/services/logger.service';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private databaseService: DatabaseService,
    private validationService: ValidationService,
    private logger: LoggerService,
  ) {
    this.logger.setContext('AuthService');
  }

  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    const { name, email, password } = registerDto;

    this.logger.log(`Registration attempt for email: ${email}`);

    // Check if user already exists
    const userExists = await this.databaseService.exists(
      users,
      eq(users.email, email),
    );

    if (userExists) {
      this.logger.warn(`Registration failed - user already exists: ${email}`);
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const [newUser] = await this.databaseService.db
      .insert(users)
      .values({
        name,
        email,
        password: hashedPassword,
      })
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        avatar: users.avatar,
        isEmailVerified: users.isEmailVerified,
      });

    // Create default workspace
    const workspaceName = `${name}'s Workspace`;
    const workspaceSlug = this.validationService.generateSlug(workspaceName);

    const [newWorkspace] = await this.databaseService.db
      .insert(workspaces)
      .values({
        name: workspaceName,
        slug: workspaceSlug,
        ownerId: newUser.id,
      })
      .returning();

    // Add user as workspace owner
    await this.databaseService.db.insert(workspaceMembers).values({
      workspaceId: newWorkspace.id,
      userId: newUser.id,
      role: 'owner',
      joinedAt: new Date(),
    });

    this.logger.log(
      `User registered successfully: ${email} with workspace: ${workspaceSlug}`,
    );

    // Generate JWT token
    const payload: JwtPayload = {
      sub: newUser.id,
      email: newUser.email,
      name: newUser.name,
    };

    const access_token = this.jwtService.sign(payload);

    return {
      access_token,
      user: newUser,
    };
  }

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const { email, password } = loginDto;

    const user = await this.validateUser(email, password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      name: user.name,
    };

    const access_token = this.jwtService.sign(payload);

    return {
      access_token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        isEmailVerified: user.isEmailVerified,
      },
    };
  }

  async validateUser(email: string, password: string): Promise<any> {
    const [user] = await this.databaseService.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (user && (await bcrypt.compare(password, user.password))) {
      const { password: _, ...result } = user;
      this.logger.log(`User login successful: ${email}`);
      return result;
    }

    this.logger.warn(`Login failed for email: ${email}`);
    return null;
  }

  async validateUserById(userId: number): Promise<any> {
    const [user] = await this.databaseService.db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        avatar: users.avatar,
        isEmailVerified: users.isEmailVerified,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }
}
