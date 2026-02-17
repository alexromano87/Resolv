import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { CheckupUser } from '../users/checkup-user.entity';

export type CheckupCurrentUserData = CheckupUser;

export const CheckupCurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): CheckupUser => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
