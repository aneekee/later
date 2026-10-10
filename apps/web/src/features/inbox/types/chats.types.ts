import type z from 'zod';

import type { MessageResolutionFilter } from '@later/types';

import type { BasePaginationParams } from '@/shared/types/api';

import type { useCreateChatFormSchema } from '../hooks/useCreateChatFormSchema';
import type { useDeleteChatFormSchema } from '../hooks/useDeleteChatFormSchema';
import type { useMoveToChatFormSchema } from '../hooks/useMoveToChatFormSchema';

export type CreateChatFormValues = z.infer<
  ReturnType<typeof useCreateChatFormSchema>['formSchema']
>;

export type MoveToChatFormValues = z.infer<
  ReturnType<typeof useMoveToChatFormSchema>['formSchema']
>;

export type DeleteChatFormValues = z.infer<
  ReturnType<typeof useDeleteChatFormSchema>['formSchema']
>;

export interface DeleteChatParams {
  chatId: string;
  targetChatId?: string;
}

export interface GetChatsListParams extends BasePaginationParams {
  search?: string;
  excludeId?: string;
}

export interface MessageResolutionOption {
  value: MessageResolutionFilter;
  label: string;
}
