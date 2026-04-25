import type { RootState } from '@/store';

export const selectActiveChatId = (state: RootState) =>
  state.chats.activeChatId;
