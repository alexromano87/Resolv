import {
  CanActivate,
  ExecutionContext,
  Injectable,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { CacheService } from './cache.service';
import { RATE_LIMIT_KEY, type RateLimitOptions } from './rate-limit.decorator';

/**
 * Redis-based Rate Limiting Guard
 *
 * Implementa rate limiting con persistenza Redis:
 * - Limiti configurabili per endpoint
 * - Persistenza su Redis per gestire load balancing
 * - Headers informativi (X-RateLimit-*)
 * - Supporto IP forwarding (X-Forwarded-For)
 *
 * Limiti di default più stringenti per sicurezza:
 * - Global: 100 req/min (default configurabile)
 * - Login: 5 req/min
 * - Backup create: 5 req/hour
 * - Backup restore: 3 req/hour
 */
@Injectable()
export class RedisRateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RedisRateLimitGuard.name);
  private readonly defaultLimit: number;
  private readonly defaultWindowMs: number;
  private readonly fallbackStore = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private readonly reflector: Reflector,
    private readonly cacheService: CacheService,
    private readonly configService: ConfigService,
  ) {
    // Limiti di default da .env (più stringenti)
    this.defaultLimit = this.configService.get<number>('RATE_LIMIT_MAX', 100);
    this.defaultWindowMs = this.configService.get<number>('RATE_LIMIT_TTL', 60000);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const handler = context.getHandler();
    const klass = context.getClass();

    // Ottieni metadata dal decorator @RateLimit
    const meta =
      this.reflector.get<RateLimitOptions>(RATE_LIMIT_KEY, handler) ||
      this.reflector.get<RateLimitOptions>(RATE_LIMIT_KEY, klass);

    const options: RateLimitOptions = {
      limit: meta?.limit ?? this.defaultLimit,
      windowMs: meta?.windowMs ?? this.defaultWindowMs,
    };

    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    if (!request) return true;

    // Estrai IP con supporto per proxy/load balancer
    const ip = this.extractClientIp(request);
    const routeKey = this.getRouteKey(request);
    const key = `ratelimit:${ip}:${request.method}:${routeKey}`;

    try {
      // Usa Redis per il rate limiting
      const result = await this.checkRateLimit(key, options);

      // Aggiungi headers informativi
      this.setRateLimitHeaders(response, result, options);

      if (!result.allowed) {
        const resetInSeconds = Math.ceil((result.resetAt - Date.now()) / 1000);
        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: 'Troppi tentativi, riprova più tardi',
            error: 'Too Many Requests',
            retryAfter: resetInSeconds,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      return true;
    } catch (error) {
      // Fallback a in-memory se Redis non disponibile
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.warn(`Redis rate limit fallback for ${key}: ${error.message}`);
      return this.checkRateLimitFallback(key, options);
    }
  }

  /**
   * Check rate limit usando Redis
   */
  private async checkRateLimit(
    key: string,
    options: RateLimitOptions,
  ): Promise<{ allowed: boolean; current: number; resetAt: number }> {
    const now = Date.now();
    const windowKey = `${key}:${Math.floor(now / options.windowMs)}`;
    const ttlSeconds = Math.ceil(options.windowMs / 1000);

    // Incrementa contatore in Redis con TTL automatico
    const count = await this.cacheService.increment(windowKey, ttlSeconds);
    const resetAt = Math.ceil(now / options.windowMs) * options.windowMs + options.windowMs;

    return {
      allowed: count <= options.limit,
      current: count,
      resetAt,
    };
  }

  /**
   * Fallback in-memory se Redis non disponibile
   */
  private checkRateLimitFallback(key: string, options: RateLimitOptions): boolean {
    const now = Date.now();
    const entry = this.fallbackStore.get(key);

    if (!entry || entry.resetAt < now) {
      this.fallbackStore.set(key, { count: 1, resetAt: now + options.windowMs });
      return true;
    }

    if (entry.count >= options.limit) {
      throw new HttpException(
        'Troppi tentativi, riprova più tardi',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    entry.count += 1;
    this.fallbackStore.set(key, entry);
    return true;
  }

  /**
   * Estrae IP del client considerando proxy e load balancer
   */
  private extractClientIp(request: any): string {
    // X-Forwarded-For: client, proxy1, proxy2
    // Prendi il primo IP (client reale)
    const forwardedFor = request.headers['x-forwarded-for'];
    if (forwardedFor) {
      const ips = Array.isArray(forwardedFor)
        ? forwardedFor[0]
        : forwardedFor.split(',')[0];
      return ips.trim();
    }

    // X-Real-IP header (Nginx)
    const realIp = request.headers['x-real-ip'];
    if (realIp) {
      return Array.isArray(realIp) ? realIp[0] : realIp;
    }

    // Fallback a request.ip
    return request.ip || request.connection?.remoteAddress || 'unknown';
  }

  /**
   * Genera chiave univoca per route
   */
  private getRouteKey(request: any): string {
    // Usa route pattern se disponibile (es: /users/:id)
    if (request.route?.path) {
      return request.route.path;
    }

    // Fallback a URL normalizzato (rimuovi query params e ID numerici)
    const url = request.url || '/';
    return url.split('?')[0].replace(/\/\d+/g, '/:id');
  }

  /**
   * Aggiungi standard rate limit headers
   */
  private setRateLimitHeaders(
    response: any,
    result: { current: number; resetAt: number },
    options: RateLimitOptions,
  ): void {
    const remaining = Math.max(0, options.limit - result.current);
    const resetInSeconds = Math.ceil((result.resetAt - Date.now()) / 1000);

    response.setHeader('X-RateLimit-Limit', options.limit.toString());
    response.setHeader('X-RateLimit-Remaining', remaining.toString());
    response.setHeader('X-RateLimit-Reset', Math.ceil(result.resetAt / 1000).toString());

    if (remaining === 0) {
      response.setHeader('Retry-After', resetInSeconds.toString());
    }
  }
}
