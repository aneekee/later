import z from 'zod';

export const useLoginFormSchema = () => {
  const formSchema = z.object({
    username: z
      .string()
      .min(1, 'Username is required')
      .max(255, 'Username must be less than 255 characters'),
    password: z
      .string()
      .min(1, 'Password is required')
      .max(255, 'Password must be less than 255 characters'),
  });

  return { formSchema };
};
