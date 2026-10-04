import type z from 'zod';

import type { MessageResolutionFilter } from '@later/types';

import type { BasePaginationParams } from '@/shared/types/api';

import type { useCreateChatFormSchema } from '../hooks/useCreateChatFormSchema';
import type { useMoveToChatFormSchema } from '../hooks/useMoveToChatFormSchema';

export type CreateChatFormValues = z.infer<
  ReturnType<typeof useCreateChatFormSchema>['formSchema']
>;

export type MoveToChatFormValues = z.infer<
  ReturnType<typeof useMoveToChatFormSchema>['formSchema']
>;

export interface GetChatsListParams extends BasePaginationParams {
  search?: string;
  excludeId?: string;
}

export interface MessageResolutionOption {
  value: MessageResolutionFilter;
  label: string;
}
