// apps/backend/src/auth/superuser.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class SuperuserGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || user.ruolo !== 'superuser') {
      throw new ForbiddenException('Accesso riservato ai superuser');
    }

    return true;
  }
}
