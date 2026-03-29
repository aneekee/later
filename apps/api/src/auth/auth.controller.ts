import { Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import { type Request, type Response } from 'express';

import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import {
  COOKIE_OPTS_BASE,
  FIFTEEN_MINUTES_MS,
  SEVEN_DAYS_MS,
} from './auth.constants';
import { Public } from './decorators/public.decorator';

@Controller('v1/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Get('me')
  getCurrrentUser(@Req() req: Request) {
    return this.authService.getMe(
      (req.cookies as Record<string, string | undefined>)['access_token'],
    );
  }

  @Public()
  @Post('login')
  async login(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken } = await this.authService.login({
      username: body.username,
      password: body.password,
    });

    res.cookie('access_token', accessToken, {
      ...COOKIE_OPTS_BASE,
      maxAge: FIFTEEN_MINUTES_MS,
    });
    res.cookie('refresh_token', refreshToken, {
      ...COOKIE_OPTS_BASE,
      maxAge: SEVEN_DAYS_MS,
    });

    return {
      message: 'Login successful',
    };
  }

  @Public()
  @Post('register')
  async register(@Body() body: RegisterDto) {
    const user = await this.authService.register({
      username: body.username,
      password: body.password,
    });

    return {
      message: 'User registered successfully, waiting for admin approval',
      data: {
        id: user.id,
        username: user.username,
      },
    };
  }

  @Public()
  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken } = await this.authService.refresh(
      (req.cookies as Record<string, string | undefined>)['refresh_token'],
    );

    res.cookie('access_token', accessToken, {
      ...COOKIE_OPTS_BASE,
      maxAge: FIFTEEN_MINUTES_MS,
    });
    res.cookie('refresh_token', refreshToken, {
      ...COOKIE_OPTS_BASE,
      maxAge: SEVEN_DAYS_MS,
    });

    return {
      message: 'Refresh successful',
    };
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('access_token', COOKIE_OPTS_BASE);
    res.clearCookie('refresh_token', COOKIE_OPTS_BASE);

    return {
      message: 'Signed out successfully',
    };
  }
}
