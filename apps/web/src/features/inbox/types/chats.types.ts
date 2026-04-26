import type z from 'zod';

import type { useCreateChatFormSchema } from '../hooks/useCreateChatFormSchema';

export type CreateChatFormValues = z.infer<
  ReturnType<typeof useCreateChatFormSchema>['formSchema']
>;
