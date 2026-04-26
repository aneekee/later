import { useState } from 'react';
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
  DialogTrigger,
} from '@/shared/components/ui/dialog';
import { useDisplayErrorToast } from '@/shared/hooks/useDisplayErrorToast';

import { useCreateChatMutation } from '@/features/inbox/api/chats.api';
import { useCreateChatFormSchema } from '@/features/inbox/hooks/useCreateChatFormSchema';
import type { CreateChatFormValues } from '@/features/inbox/types/chats.types';
import { CREATE_CHAT_FORM_DEFAULT_VALUES } from '@/features/inbox/const/chats.constants';
import { mapChatFormToCreateChatDto } from '@/features/inbox/utils/chat.utils';

import { ChatForm } from './ChatForm';

export const CreateChatDialog = () => {
  const [open, setOpen] = useState(false);

  const [createChat] = useCreateChatMutation();
  const { formSchema } = useCreateChatFormSchema();
  const { displayErrorToast } = useDisplayErrorToast();

  const methods = useForm<CreateChatFormValues>({
    defaultValues: CREATE_CHAT_FORM_DEFAULT_VALUES,
    resolver: zodResolver(formSchema),
  });

  const onSubmit = async () => {
    try {
      const valid = await methods.trigger();
      if (!valid) {
        return;
      }

      const formValues = methods.getValues();
      await createChat(mapChatFormToCreateChatDto(formValues)).unwrap();
      setOpen(false);
    } catch (e) {
      console.error('Create chat error:', e);
      displayErrorToast(e, 'Create chat failed');
    }
  };

  const onOpenChange = (open: boolean) => {
    if (!open) {
      methods.reset();
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(isOpen) => {
          setOpen(isOpen);
          onOpenChange(isOpen);
        }}
      >
        <DialogTrigger asChild>
          <Button variant="outline">Create</Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Chat</DialogTitle>
            <DialogDescription>Create inbox group</DialogDescription>
          </DialogHeader>
          <div className="mt-2">
            <FormProvider {...methods}>
              <ChatForm />
            </FormProvider>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={() => void onSubmit()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
