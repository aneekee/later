import { createApi } from '@reduxjs/toolkit/query/react';

import type {
  GetNotesBurndownSuccessResponse,
  GetNotesTotalsSuccessResponse,
} from '@later/types';

import { baseQueryWithCookies } from '@/shared/api/api';
import type { GetNotesBurndownParams } from '../types/stats.types';

export const statsApi = createApi({
  reducerPath: 'statsApi',
  baseQuery: baseQueryWithCookies,
  tagTypes: ['NotesTotals', 'NotesBurndown'],
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
    notesBurndown: builder.query<
      GetNotesBurndownSuccessResponse,
      GetNotesBurndownParams
    >({
      query: ({ timezone }) => {
        const queryParams = new URLSearchParams({ timezone });

        return {
          method: 'GET',
          url: `v1/stats/notes/burndown?${queryParams}`,
        };
      },
      providesTags: ['NotesBurndown'],
    }),
  }),
});

export const { useNotesTotalsQuery, useNotesBurndownQuery } = statsApiEndpoints;
