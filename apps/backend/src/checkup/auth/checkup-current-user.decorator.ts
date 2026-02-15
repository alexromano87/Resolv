import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface CheckupCurrentUserData {
  id: string;
  email: string;
  nome: string;
  cognome: string;
  ruolo: 'admin_studio' | 'segreteria' | 'collaboratore' | 'cliente';
  studioId: string | null;
  azienda: string | null;
  mustChangePassword: boolean;
}

export const CheckupCurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): CheckupCurrentUserData => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
