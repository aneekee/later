import { createApi } from '@reduxjs/toolkit/query/react';

import type { GetNotesTotalsSuccessResponse } from '@later/types';

import { baseQueryWithCookies } from '@/shared/api/api';

export const statsApi = createApi({
  reducerPath: 'statsApi',
  baseQuery: baseQueryWithCookies,
  tagTypes: ['NotesTotals'],
  endpoints: () => ({}),
  keepUnusedDataFor: 0,
  refetchOnMountOrArgChange: true,
});

export const statsApiEndpoints = statsApi.injectEndpoints({
  endpoints: (builder) => ({
    notesTotals: builder.query<GetNotesTotalsSuccessResponse, void>({
      query: () => ({
        method: 'GET',
        url: 'v1/stats/notes/totals',
      }),
      providesTags: ['NotesTotals'],
    }),
  }),
});

export const { useNotesTotalsQuery } = statsApiEndpoints;
