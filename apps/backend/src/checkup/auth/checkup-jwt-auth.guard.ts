import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class CheckupJwtAuthGuard extends AuthGuard('checkup-jwt') {}
