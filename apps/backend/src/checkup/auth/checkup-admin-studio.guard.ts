import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class CheckupAdminStudioGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || user.ruolo !== 'admin_studio') {
      throw new ForbiddenException('Accesso riservato agli amministratori dello studio');
    }

    return true;
  }
}
