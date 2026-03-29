import { fetchBaseQuery } from '@reduxjs/toolkit/query';

export const baseQueryWithCookies = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_BASE_URL,
  credentials: 'include',
});
