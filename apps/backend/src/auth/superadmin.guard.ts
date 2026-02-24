// apps/backend/src/auth/superadmin.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class SuperadminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || user.ruolo !== 'superadmin') {
      throw new ForbiddenException('Accesso riservato ai superadmin');
    }

    return true;
  }
}
