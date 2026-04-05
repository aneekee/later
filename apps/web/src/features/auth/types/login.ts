import type z from 'zod';

import type { useLoginFormSchema } from '../hooks/useLoginFormSchema';

export type LoginFormValues = z.infer<
  ReturnType<typeof useLoginFormSchema>['formSchema']
>;
