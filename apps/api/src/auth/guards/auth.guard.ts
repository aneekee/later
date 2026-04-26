import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';

import { AuthService } from '../auth.service';
import { IS_PUBLIC_KEY } from '../auth.constants';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private authService: AuthService,
  ) {}

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const accessToken = (request.cookies as Record<string, string | undefined>)[
      'access_token'
    ];

    if (!accessToken) {
      return false;
    }

    try {
      const payload = this.authService.getAccessTokenPayload(accessToken);

      request['user'] = payload;

      return true;
    } catch (error) {
      console.error('Error validating access token in AuthGuard:', error);
      return false;
    }
  }
}
