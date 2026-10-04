import z from 'zod';

export const useMoveToChatFormSchema = () => {
  const formSchema = z.object({
    targetChatId: z.string().min(1, { error: 'Select a chat' }),
  });

  return { formSchema };
};
