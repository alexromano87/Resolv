// apps/backend/src/auth/admin.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || user.ruolo !== 'admin') {
      throw new ForbiddenException('Accesso riservato agli amministratori');
    }

    return true;
  }
}
