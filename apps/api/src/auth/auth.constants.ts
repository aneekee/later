export const COOKIE_OPTS_BASE = {
  httpOnly: true,
  secure: true,
  sameSite: 'none' as const,
  path: '/',
};

export const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
export const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export const IS_PUBLIC_KEY = 'is_public';
