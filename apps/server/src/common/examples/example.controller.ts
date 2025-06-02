import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RbacGuard } from '../../auth/guards/rbac.guard';
import { RequirePermissions } from '../../auth/decorators/permissions.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { CurrentWorkspace } from '../../auth/decorators/workspace.decorator';
import { Permission } from '../../auth/rbac/permissions';
import { DatabaseService } from '../services/database.service';
import { ValidationService } from '../services/validation.service';
import { EncryptionService } from '../services/encryption.service';
import { LoggerService } from '../services/logger.service';
import { ResponseUtil } from '../utils/response.util';

/**
 * Example controller showing how to use the Common Module
 * This demonstrates best practices for using shared services
 */
@Controller('example')
@UseGuards(JwtAuthGuard, RbacGuard)
export class ExampleController {
  constructor(
    private databaseService: DatabaseService,
    private validationService: ValidationService,
    private encryptionService: EncryptionService,
    private logger: LoggerService,
  ) {
    this.logger.setContext('ExampleController');
  }

  /**
   * Example: Using database service with pagination
   */
  @Get('users')
  @RequirePermissions(Permission.WORKSPACE_READ)
  async getUsers(
    @CurrentUser() user: any,
    @CurrentWorkspace() workspace: any,
  ) {
    this.logger.log(`Fetching users for workspace ${workspace.id}`, {
      userId: user.id,
      workspaceId: workspace.id,
    });

    // Example pagination query
    const paginationOptions = { page: 1, limit: 10 };
    
    // This would be a real query in practice
    const mockData = [
      { id: 1, name: 'John Doe', email: 'john@example.com' },
      { id: 2, name: 'Jane Smith', email: 'jane@example.com' },
    ];

    const paginatedResult = {
      data: mockData,
      pagination: {
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      },
    };

    return ResponseUtil.paginated(paginatedResult);
  }

  /**
   * Example: Using validation service
   */
  @Post('validate-data')
  @RequirePermissions(Permission.WORKSPACE_READ)
  async validateData(
    @Body() data: { email: string; password: string; slug: string },
    @CurrentUser() user: any,
  ) {
    this.logger.log(`Validating data for user ${user.id}`);

    const validationResults = {
      email: this.validationService.isValidEmail(data.email),
      password: this.validationService.isValidPassword(data.password),
      slug: this.validationService.isValidSlug(data.slug),
    };

    return ResponseUtil.success(validationResults, 'Validation completed');
  }

  /**
   * Example: Using encryption service
   */
  @Post('encrypt-secret')
  @RequirePermissions(Permission.INTEGRATION_CREATE)
  async encryptSecret(
    @Body() data: { secret: string },
    @CurrentUser() user: any,
  ) {
    this.logger.log(`Encrypting secret for user ${user.id}`);

    const encrypted = this.encryptionService.encrypt(data.secret);
    const apiKey = this.encryptionService.generateApiKey();

    return ResponseUtil.success({
      encrypted,
      apiKey,
      message: 'Secret encrypted successfully',
    });
  }

  /**
   * Example: Error handling with logging
   */
  @Get('error-example')
  async errorExample(@CurrentUser() user: any) {
    try {
      // Simulate some operation that might fail
      throw new Error('Something went wrong');
    } catch (error) {
      this.logger.error(
        'Example error occurred',
        error.stack,
        { userId: user.id, operation: 'error-example' },
      );
      
      return ResponseUtil.error('Operation failed', error.message);
    }
  }
}
