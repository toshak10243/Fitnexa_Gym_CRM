import { ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../../../common/decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = any>(err: any, user: any, info: any, context: ExecutionContext): TUser {
    const authenticated = super.handleRequest(err, user, info, context) as any;
    const request = context.switchToHttp().getRequest();
    const path = (request.originalUrl || request.url || '').split('?')[0].replace(/\/$/, '');
    const allowed = ['/auth/me', '/auth/change-password', '/auth/logout'].some((suffix) => path.endsWith(suffix));
    if (authenticated?.mustChangePassword && !allowed) {
      throw new ForbiddenException('Change your temporary password before accessing the console.');
    }
    return authenticated as TUser;
  }
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }
}
