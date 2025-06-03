import {
  CanActivate,
  ExecutionContext,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { eq, and } from 'drizzle-orm';
import { db, workspaceMembers } from '@repo/database';
import { Permission, ROLE_PERMISSIONS } from '@auth/rbac/permissions';
import { PERMISSIONS_KEY } from '@auth/decorators/permissions.decorator';

@Injectable()
export class RbacGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions) {
      return true; // No permissions required
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const workspaceId = this.extractWorkspaceId(request);

    if (!user || !workspaceId) {
      throw new ForbiddenException('User or workspace context missing');
    }

    // Get user's role in the workspace
    const [membership] = await db
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.userId, user.id),
          eq(workspaceMembers.workspaceId, workspaceId),
        ),
      )
      .limit(1);

    if (!membership) {
      throw new ForbiddenException('User is not a member of this workspace');
    }

    // Check if user's role has required permissions
    const userPermissions = ROLE_PERMISSIONS[membership.role] || [];
    const hasPermission = requiredPermissions.every((permission) =>
      userPermissions.includes(permission),
    );

    if (!hasPermission) {
      throw new ForbiddenException('Insufficient permissions');
    }

    // Add workspace context to request
    request.workspace = { id: workspaceId, role: membership.role };

    return true;
  }

  private extractWorkspaceId(request: any): number | null {
    // Try to get workspace ID from different sources
    const workspaceId =
      request.params?.workspaceId ||
      request.query?.workspaceId ||
      request.body?.workspaceId ||
      request.headers['x-workspace-id'];

    return workspaceId ? parseInt(workspaceId, 10) : null;
  }
}
