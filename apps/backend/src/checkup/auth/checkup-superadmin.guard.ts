import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class CheckupSuperadminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || user.ruolo !== 'superadmin') {
      throw new ForbiddenException('Accesso riservato al superadmin');
    }

    return true;
  }
}
