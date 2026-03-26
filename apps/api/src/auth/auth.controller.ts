import { Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse } from '@nestjs/swagger';
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

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Get('/me')
  @ApiOperation({ summary: 'Get current authenticated user' })
  @ApiResponse({
    status: 200,
    description: 'Current user data',
    schema: {
      example: {
        id: '123e4567-e89b-12d3-a456-426614174000',
        username: 'johndoe',
        isVerified: true,
        createdAt: '2026-03-24T12:00:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token' })
  getCurrrentUser(@Req() req: Request) {
    return this.authService.getMe(
      (req.cookies as Record<string, string | undefined>)['access_token'],
    );
  }

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Login with username and password' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    schema: { example: { message: 'Login successful' } },
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
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
  @ApiOperation({ summary: 'Register a new user' })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully, waiting for admin approval',
    schema: {
      example: {
        message: 'User registered successfully, waiting for admin approval',
        data: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          username: 'johndoe',
        },
      },
    },
  })
  @ApiResponse({ status: 409, description: 'Username already exists' })
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
  @ApiOperation({ summary: 'Refresh access token using refresh_token cookie' })
  @ApiResponse({
    status: 200,
    description: 'Tokens refreshed successfully',
    schema: { example: { message: 'Refresh successful' } },
  })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
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

  @Post('signout')
  @ApiOperation({ summary: 'Sign out and clear auth cookies' })
  @ApiResponse({
    status: 200,
    description: 'Signed out successfully',
    schema: { example: { message: 'Signed out successfully' } },
  })
  signOut(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('access_token', COOKIE_OPTS_BASE);
    res.clearCookie('refresh_token', COOKIE_OPTS_BASE);

    return {
      message: 'Signed out successfully',
    };
  }
}
