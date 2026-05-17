import z from 'zod';

export const useResolveMessageFormSchema = () => {
  const formSchema = z.object({
    note: z.string().min(1, { error: 'The note is required' }).max(2000),
  });

  return { formSchema };
};
