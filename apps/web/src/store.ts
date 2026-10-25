import { configureStore } from '@reduxjs/toolkit';

import { authApi } from './features/auth/api/auth.api';
import { statsApi } from './features/dashboard/api/stats.api';
import { feedApi } from './features/feed/api/feed.api';
import { notesApi } from './features/notes/api/notes.api';

export const store = configureStore({
  reducer: {
    // api
    [authApi.reducerPath]: authApi.reducer,
    [statsApi.reducerPath]: statsApi.reducer,
    [feedApi.reducerPath]: feedApi.reducer,
    [notesApi.reducerPath]: notesApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware()
      .concat(authApi.middleware)
      .concat(statsApi.middleware)
      .concat(feedApi.middleware)
      .concat(notesApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
