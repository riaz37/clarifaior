import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';

@Injectable()
export class RefreshTokenGuard extends AuthGuard('jwt-refresh') {
  constructor() {
    super();
  }

  getRequest(context: ExecutionContext) {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest();
    
    // Get the refresh token from the request body
    if (request.body && request.body.refresh_token) {
      return request;
    }
    
    // If not in body, try to get it from headers
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      request.body = { ...request.body, refresh_token: authHeader.split(' ')[1] };
    }
    
    return request;
  }

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    // Add your custom authentication logic here
    // for example, check if the refresh token exists in the request
    const request = context.switchToHttp().getRequest();
    if (!request.body?.refresh_token) {
      return false;
    }
    
    return super.canActivate(context);
  }
}
