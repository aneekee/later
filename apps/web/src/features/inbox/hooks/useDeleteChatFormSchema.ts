import z from 'zod';

export const useDeleteChatFormSchema = () => {
  const formSchema = z.object({
    targetChatId: z.string(),
  });

  return { formSchema };
};
