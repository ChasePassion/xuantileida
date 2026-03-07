import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

const THROTTLE_KEY = 'throttle';

export const Throttle = (limit: number, ttl: number) =>
  (target: any, key?: string, descriptor?: PropertyDescriptor) => {
    if (descriptor) {
      Reflect.defineMetadata(THROTTLE_KEY, { limit, ttl }, descriptor.value);
      return descriptor;
    }
    Reflect.defineMetadata(THROTTLE_KEY, { limit, ttl }, target);
    return target;
  };

@Injectable()
export class ThrottleGuard implements CanActivate {
  private readonly store = new Map<string, { count: number; resetAt: number }>();

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const throttleConfig = this.reflector.get<{ limit: number; ttl: number }>(
      THROTTLE_KEY,
      context.getHandler(),
    ) || this.reflector.get<{ limit: number; ttl: number }>(
      THROTTLE_KEY,
      context.getClass(),
    );

    if (!throttleConfig) return true;

    const request = context.switchToHttp().getRequest();
    const key = `${request.user?.sub || request.ip}:${request.method}:${request.url}`;
    const now = Date.now();

    const entry = this.store.get(key);
    if (!entry || now > entry.resetAt) {
      this.store.set(key, { count: 1, resetAt: now + throttleConfig.ttl * 1000 });
      return true;
    }

    if (entry.count >= throttleConfig.limit) {
      throw new HttpException(
        { code: 429, message: '请求过于频繁，请稍后再试' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    entry.count++;
    return true;
  }
}
