import type { TextMessageEntity } from '@repo/types';

export const buildOptimisticTextMessage = (
  chatId: string,
  content: string,
): TextMessageEntity => ({
  id: `MOCK-ID-${crypto.randomUUID()}`,
  type: 'TEXT',
  chatId,
  createdAt: new Date().toISOString(),
  textMessage: {
    id: crypto.randomUUID(),
    messageId: '',
    content,
  },
});
