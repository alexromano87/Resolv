import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class CheckupAdminStudioGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Check if user is admin_studio or superadmin
    if (user.ruolo !== 'admin_studio' && user.ruolo !== 'superadmin') {
      throw new ForbiddenException('Only studio administrators can access this resource');
    }

    return true;
  }
}
