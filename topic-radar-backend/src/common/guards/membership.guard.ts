import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';

@Injectable()
export class MembershipGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('需要登录');
    }

    if (user.membership === 'free') {
      throw new ForbiddenException('该功能需要升级会员');
    }

    if (
      user.membershipExpiresAt &&
      new Date(user.membershipExpiresAt) < new Date()
    ) {
      throw new ForbiddenException('会员已过期，请续费');
    }

    return true;
  }
}
