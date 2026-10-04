import type z from 'zod';

import type {
  CreateTextMessageRequestBody,
  MessageResolutionFilter,
  MoveChatMessagesRequestBody,
  MoveMessageRequestBody,
  ResolveMessageRequestBody,
  UpdateTextMessageRequestBody,
} from '@later/types';

import type { useResolveMessageFormSchema } from '../hooks/useResolveMessageFormSchema';

export type ResolveMessageFormValues = z.infer<
  ReturnType<typeof useResolveMessageFormSchema>['formSchema']
>;

import type { BasePaginationParams } from '@/shared/types/api';

export interface GetMessagesListParams extends BasePaginationParams {
  chatId: string;
  resolution?: MessageResolutionFilter;
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

export interface ResolveMessageParams {
  chatId: string;
  messageId: string;
  body?: ResolveMessageRequestBody;
}

export interface UnresolveMessageParams {
  chatId: string;
  messageId: string;
  resolutionId: string;
}

export interface DeleteMessageParams {
  chatId: string;
  messageId: string;
}

export interface MoveMessageParams {
  chatId: string;
  messageId: string;
  body: MoveMessageRequestBody;
}

export interface MoveChatMessagesParams {
  chatId: string;
  body: MoveChatMessagesRequestBody;
}
