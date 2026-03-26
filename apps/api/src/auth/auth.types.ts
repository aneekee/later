export type RegisterServiceDto = {
  username: string;
  password: string;
};

export type LoginServiceDto = {
  username: string;
  password: string;
};

export interface TokenPayload {
  id: string;
}

export interface AccessTokenPayload extends TokenPayload {
  username: string;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface RefreshTokenPayload extends TokenPayload {}

export type AuthTokenSecretKey = 'JWT_ACCESS_SECRET' | 'JWT_REFRESH_SECRET';
