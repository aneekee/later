import { FormProvider, useForm } from 'react-hook-form';
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
import { useDisplayErrorToast } from '@/shared/hooks/useDisplayErrorToast';

import { useResolveMessageMutation } from '@/features/inbox/api/messages.api';
import { useResolveMessageFormSchema } from '@/features/inbox/hooks/useResolveMessageFormSchema';
import { RESOLVE_MESSAGE_FORM_DEFAULT_VALUES } from '@/features/inbox/const/message.constants';
import type { ResolveMessageFormValues } from '@/features/inbox/types/messages.types';

import { ResolveMessageForm } from './ResolveMessageForm';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chatId: string;
  messageId: string;
}

export const ResolveMessageDialog = ({
  open,
  onOpenChange,
  chatId,
  messageId,
}: Props) => {
  const [resolveMessage] = useResolveMessageMutation();
  const { formSchema } = useResolveMessageFormSchema();
  const { displayErrorToast } = useDisplayErrorToast();

  const methods = useForm<ResolveMessageFormValues>({
    defaultValues: RESOLVE_MESSAGE_FORM_DEFAULT_VALUES,
    resolver: zodResolver(formSchema),
  });

  const onSubmit = async () => {
    try {
      const valid = await methods.trigger();
      if (!valid) {
        return;
      }

      const { note } = methods.getValues();
      await resolveMessage({ chatId, messageId, body: { note } }).unwrap();
      onOpenChange(false);
    } catch (e) {
      console.error('Resolve message error:', e);
      displayErrorToast(e, 'Resolve failed');
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      methods.reset();
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Resolve Message</DialogTitle>
          <DialogDescription>
            Add a note explaining how this was resolved
          </DialogDescription>
        </DialogHeader>
        <div className="mt-2">
          <FormProvider {...methods}>
            <ResolveMessageForm />
          </FormProvider>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={() => void onSubmit()}>Resolve</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
