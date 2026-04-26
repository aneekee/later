import z from 'zod';

export const useCreateChatFormSchema = () => {
  const formSchema = z.object({
    title: z.string().min(1, { error: 'The title is required' }).max(255),
    icon: z.string().max(2).optional(),
  });

  return { formSchema };
};
