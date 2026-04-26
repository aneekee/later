import type {
  CreateTextMessageRequestBody,
  UpdateTextMessageRequestBody,
} from '@repo/types';

import type { BasePaginationParams } from '@/shared/types/api';

export interface GetMessagesListParams extends BasePaginationParams {
  chatId: string;
}

export interface CreateTextMessageParams {
  chatId: string;
  body: CreateTextMessageRequestBody;
}

export interface UpdateTextMessageParams {
  chatId: string;
  messageId: string;
  body: UpdateTextMessageRequestBody;
}

export interface DeleteMessageParams {
  chatId: string;
  messageId: string;
}
