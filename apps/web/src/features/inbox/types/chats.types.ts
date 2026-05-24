import type z from 'zod';

import type { MessageResolutionFilter } from '@later/types';

import type { useCreateChatFormSchema } from '../hooks/useCreateChatFormSchema';

export type CreateChatFormValues = z.infer<
  ReturnType<typeof useCreateChatFormSchema>['formSchema']
>;

export interface MessageResolutionOption {
  value: MessageResolutionFilter;
  label: string;
}
