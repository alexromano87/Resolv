import {
  CanActivate,
  ExecutionContext,
  Injectable,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RATE_LIMIT_KEY, type RateLimitOptions } from './rate-limit.decorator';

@Injectable()
export class RateLimitGuard implements CanActivate {
  readonly store = new Map<string, { count: number; resetAt: number }>();
  // Limiti più alti per evitare problemi con E2E tests
  private readonly defaultLimit = 1000;
  private readonly defaultWindowMs = 60_000;

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const handler = context.getHandler();
    const klass = context.getClass();

    const meta =
      this.reflector.get<RateLimitOptions>(RATE_LIMIT_KEY, handler) ||
      this.reflector.get<RateLimitOptions>(RATE_LIMIT_KEY, klass);

    const options: RateLimitOptions = {
      limit: meta?.limit ?? this.defaultLimit,
      windowMs: meta?.windowMs ?? this.defaultWindowMs,
    };

    const request = context.switchToHttp().getRequest();
    if (!request) return true;

    const ipHeader = request.headers?.['x-forwarded-for'];
    const ip =
      (Array.isArray(ipHeader) ? ipHeader[0] : ipHeader) ||
      request.ip ||
      'unknown';
    const routeKey = request.route?.path || request.url || 'unknown';
    const key = `${ip}:${request.method}:${routeKey}`;

    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || entry.resetAt < now) {
      this.store.set(key, { count: 1, resetAt: now + options.windowMs });
      return true;
    }

    if (entry.count >= options.limit) {
      throw new HttpException('Troppi tentativi, riprova più tardi', HttpStatus.TOO_MANY_REQUESTS);
    }

    entry.count += 1;
    this.store.set(key, entry);
    return true;
  }
}
