import type { RootState } from '@/store';

export const selectActiveChat = (state: RootState) => state.chats.activeChat;

export const selectActiveChatId = (state: RootState) =>
  state.chats.activeChat?.id;
