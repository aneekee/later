import { useCallback } from 'react';
import { toast } from 'sonner';

export const useDisplayErrorToast = () => {
  const displayErrorToast = useCallback(
    (error: unknown, fallbackMessage: string) => {
      const message = (error as { data?: { message?: string } } | undefined)
        ?.data?.message;
      toast.error(message ?? fallbackMessage);
    },
    [],
  );

  return { displayErrorToast };
};
