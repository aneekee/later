import { configureStore } from '@reduxjs/toolkit';

import { authApi } from './features/auth/api/auth.api';
import { chatsApi } from './features/notes/api/chats.api';
import { messagesApi } from './features/notes/api/messages.api';

export const store = configureStore({
  reducer: {
    [authApi.reducerPath]: authApi.reducer,
    [chatsApi.reducerPath]: chatsApi.reducer,
    [messagesApi.reducerPath]: messagesApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware()
      .concat(authApi.middleware)
      .concat(chatsApi.middleware)
      .concat(messagesApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;

export type AppDispatch = typeof store.dispatch;
