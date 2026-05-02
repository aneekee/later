import { ChatEntity } from '@later/types';

import { ChatModel } from '../../generated/prisma/models/Chat';

export function mapChatModelToEntity(chat: ChatModel): ChatEntity {
  return {
    ...chat,
    createdAt: chat.createdAt.toISOString(),
  };
}
