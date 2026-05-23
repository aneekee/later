import type { BasePaginationParams } from '@/shared/types/api';

import type {
  CreateChatFormValues,
  MessageResolutionOption,
} from '../types/chats.types';

export const CHATS_DEFAULT_PAGINATION: BasePaginationParams = {
  page: 1,
  pageSize: 20,
};

export const CREATE_CHAT_FORM_DEFAULT_VALUES: CreateChatFormValues = {
  title: '',
};

export const RESOLUTION_OPTIONS: MessageResolutionOption[] = [
  { value: 'unresolved', label: 'Unresolved' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'both', label: 'All' },
];
