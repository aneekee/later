import { createApi } from '@reduxjs/toolkit/query/react';
import type {
  LoginRequestBody,
  LoginSuccessResponse,
  MeSuccessResponse,
  RegisterRequestBody,
  RegisterSuccessResponseData,
} from '@repo/types';

import { baseQueryWithCookies } from '../../../shared/api/api';

export const authApi = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithCookies,
  tagTypes: ['Auth'],
  endpoints: () => ({}),
});

export const authApiEndpoints = authApi.injectEndpoints({
  endpoints: (builder) => ({
    me: builder.query<MeSuccessResponse, void>({
      query: () => ({
        url: 'v1/auth/me',
        method: 'GET',
      }),
      providesTags: ['Auth'],
    }),

    register: builder.mutation<
      RegisterSuccessResponseData,
      RegisterRequestBody
    >({
      query: (data) => ({
        url: 'v1/auth/register',
        method: 'POST',
        body: data,
      }),
    }),

    login: builder.mutation<LoginSuccessResponse, LoginRequestBody>({
      query: (data) => ({
        url: 'v1/auth/login',
        method: 'POST',
        body: data,
      }),
    }),

    refresh: builder.mutation({
      query: () => ({
        url: 'v1/auth/refresh',
        method: 'POST',
      }),
    }),

    logout: builder.mutation({
      query: () => ({
        url: 'v1/auth/logout',
        method: 'POST',
      }),
      invalidatesTags: ['Auth'],
    }),
  }),
  overrideExisting: false,
});

export const {
  useMeQuery,
  useLazyMeQuery,
  useRegisterMutation,
  useLoginMutation,
  useRefreshMutation,
  useLogoutMutation,
} = authApiEndpoints;
