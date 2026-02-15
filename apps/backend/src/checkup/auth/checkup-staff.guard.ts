import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

const STAFF_ROLES = ['admin_studio', 'segreteria', 'collaboratore'];

@Injectable()
export class CheckupStaffGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !STAFF_ROLES.includes(user.ruolo)) {
      throw new ForbiddenException('Accesso riservato al personale dello studio');
    }

    return true;
  }
}
