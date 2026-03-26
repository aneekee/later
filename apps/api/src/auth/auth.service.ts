import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { UsersService } from 'src/users/users.service';
import {
  AccessTokenPayload,
  AuthTokenSecretKey,
  LoginServiceDto,
  RefreshTokenPayload,
  RegisterServiceDto,
  TokenPayload,
} from './auth.types';

@Injectable()
export class AuthService {
  constructor(
    private configService: ConfigService,
    private jwtService: JwtService,
    private usersService: UsersService,
  ) {}

  private getTokenPayload<T extends TokenPayload>(
    token: string | null | undefined,
    secretKey: AuthTokenSecretKey,
  ): T {
    if (!token) {
      console.error('No token provided');
      throw new UnauthorizedException('No token provided');
    }

    try {
      const payload = this.jwtService.verify<T>(token, {
        secret: this.configService.get(secretKey),
      });

      return payload;
    } catch (error) {
      console.error('Error verifying token:', error);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  getAccessTokenPayload(token?: string) {
    return this.getTokenPayload<AccessTokenPayload>(token, 'JWT_ACCESS_SECRET');
  }

  getRefreshTokenPayload(token?: string) {
    return this.getTokenPayload<RefreshTokenPayload>(
      token,
      'JWT_REFRESH_SECRET',
    );
  }

  async getMe(accessToken: string | undefined) {
    const payload = this.getAccessTokenPayload(accessToken);
    const user = await this.usersService.findById(payload.id);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: user.id,
      username: user.username,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
    };
  }

  signAccessToken(userId: string, username: string) {
    return this.jwtService.sign(
      { id: userId, username },
      { secret: process.env.JWT_ACCESS_SECRET, expiresIn: '15m' },
    );
  }

  signRefreshToken(userId: string) {
    return this.jwtService.sign(
      { id: userId },
      { secret: process.env.JWT_REFRESH_SECRET, expiresIn: '7d' },
    );
  }

  async refresh(refreshToken: string | undefined) {
    const payload = this.getRefreshTokenPayload(refreshToken);
    const user = await this.usersService.findById(payload.id);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const accessToken = this.signAccessToken(user.id, user.username);
    const newRefreshToken = this.signRefreshToken(user.id);

    return { accessToken, refreshToken: newRefreshToken };
  }

  async register({ username, password }: RegisterServiceDto) {
    const exists = await this.usersService.findByUsername(username);
    if (exists) {
      throw new ConflictException('Username already taken');
    }

    const salt = +this.configService.get('PASSWORD_SALT_ROUNDS');
    const passwordHash = await bcrypt.hash(password, salt);
    const user = await this.usersService.create({ username, passwordHash });

    return { id: user.id, username: user.username };
  }

  async login({ username, password }: LoginServiceDto) {
    const user = await this.usersService.findByUsername(username);
    if (!user) {
      throw new NotFoundException('User with this username does not exist');
    }

    if (!user.isVerified) {
      throw new BadRequestException('User is not verified yet');
    }

    const passwordMatches = await bcrypt.compare(password, user.password);
    if (!passwordMatches) {
      throw new BadRequestException('Incorrect password');
    }

    const accessToken = this.signAccessToken(user.id, user.username);
    const refreshToken = this.signRefreshToken(user.id);

    return {
      accessToken,
      refreshToken,
    };
  }
}
