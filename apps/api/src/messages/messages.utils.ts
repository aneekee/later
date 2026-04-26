import { TextMessageEntity } from '@repo/types';

import { MessageWithTextMessage } from './messages.types';

export function mapMessageModelToEntity(
  message: MessageWithTextMessage,
): TextMessageEntity {
  return {
    ...message,
    createdAt: message.createdAt.toISOString(),
  };
}
