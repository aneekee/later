import { FormProvider, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Spinner } from '@/shared/components/ui/spinner';
import { useDisplayErrorToast } from '@/shared/hooks/useDisplayErrorToast';

import { useMoveToChatFormSchema } from '@/features/inbox/hooks/useMoveToChatFormSchema';
import { MOVE_TO_CHAT_FORM_DEFAULT_VALUES } from '@/features/inbox/const/chats.constants';
import type { MoveToChatFormValues } from '@/features/inbox/types/chats.types';

import { MoveToChatForm } from './MoveToChatForm';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  excludeChatId: string;
  errorMessage: string;
  onSubmit: (targetChatId: string) => Promise<unknown>;
}

export const MoveToChatDialog = ({
  open,
  onOpenChange,
  title,
  description,
  excludeChatId,
  errorMessage,
  onSubmit,
}: Props) => {
  const { formSchema } = useMoveToChatFormSchema();
  const { displayErrorToast } = useDisplayErrorToast();

  const methods = useForm<MoveToChatFormValues>({
    defaultValues: MOVE_TO_CHAT_FORM_DEFAULT_VALUES,
    resolver: zodResolver(formSchema),
  });

  const targetChatId = useWatch({
    control: methods.control,
    name: 'targetChatId',
  });
  const { isSubmitting } = methods.formState;

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      methods.reset();
    }
    onOpenChange(isOpen);
  };

  const onValid = async (values: MoveToChatFormValues) => {
    try {
      await onSubmit(values.targetChatId);
      handleOpenChange(false);
    } catch (e) {
      console.error('Move to chat error:', e);
      displayErrorToast(e, errorMessage);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="mt-2">
          <FormProvider {...methods}>
            <MoveToChatForm excludeChatId={excludeChatId} />
          </FormProvider>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            disabled={!targetChatId || isSubmitting}
            onClick={() => void methods.handleSubmit(onValid)()}
          >
            {isSubmitting ? <Spinner /> : null}
            Move
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
