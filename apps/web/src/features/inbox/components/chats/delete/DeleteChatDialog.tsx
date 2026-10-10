import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import type { ChatEntity, ChatStatsEntity } from '@later/types';

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
import { Field } from '@/shared/components/ui/field';
import { Label } from '@/shared/components/ui/label';
import { Spinner } from '@/shared/components/ui/spinner';
import { useDisplayErrorToast } from '@/shared/hooks/useDisplayErrorToast';

import { useDeleteChatFormSchema } from '@/features/inbox/hooks/useDeleteChatFormSchema';
import { DELETE_CHAT_FORM_DEFAULT_VALUES } from '@/features/inbox/const/chats.constants';
import type { DeleteChatFormValues } from '@/features/inbox/types/chats.types';

import { ChatCombobox } from '../../MoveToChat/ChatCombobox';
import {
  useChatStatsQuery,
  useDeleteChatMutation,
} from '../../../api/chats.api';
import { buildStatsDescription } from '@/features/inbox/utils/chat.utils';

interface Props {
  chat: ChatEntity;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}

export const DeleteChatDialog = ({
  chat,
  open,
  onOpenChange,
  onDeleted,
}: Props) => {
  const { formSchema } = useDeleteChatFormSchema();
  const { displayErrorToast } = useDisplayErrorToast();

  const {
    data: statsData,
    isFetching: isStatsFetching,
    isError: isStatsError,
    refetch: refetchStats,
  } = useChatStatsQuery(chat.id, { refetchOnMountOrArgChange: true });
  const [deleteChat] = useDeleteChatMutation();

  const methods = useForm<DeleteChatFormValues>({
    defaultValues: DELETE_CHAT_FORM_DEFAULT_VALUES,
    resolver: zodResolver(formSchema),
  });

  const targetChatId = useWatch({
    control: methods.control,
    name: 'targetChatId',
  });
  const { isSubmitting } = methods.formState;

  const stats = statsData?.data?.stats;
  const isStatsReady = !isStatsFetching && !isStatsError && !!stats;

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      methods.reset();
    }
    onOpenChange(isOpen);
  };

  const onSubmit = async (values: DeleteChatFormValues) => {
    try {
      await deleteChat({
        chatId: chat.id,
        targetChatId: values.targetChatId || undefined,
      }).unwrap();
      onDeleted();
      handleOpenChange(false);
    } catch (e) {
      console.error('Delete chat error:', e);
      displayErrorToast(e, 'Delete chat failed');
    }
  };

  const renderBody = () => {
    if (isStatsFetching) {
      return (
        <div className="flex justify-center py-4">
          <Spinner />
        </div>
      );
    }

    if (isStatsError || !stats) {
      return (
        <div className="flex flex-col items-center gap-2 py-4 text-sm">
          <span className="text-muted-foreground">
            Failed to load chat info
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void refetchStats()}
          >
            Retry
          </Button>
        </div>
      );
    }

    if (!stats.total) {
      return (
        <DialogDescription>
          {`Delete chat '${chat.title}'? This can't be undone.`}
        </DialogDescription>
      );
    }

    return (
      <div className="space-y-4">
        <DialogDescription>
          {buildStatsDescription(chat.title, stats)}
        </DialogDescription>
        <div className="space-y-2">
          <Label htmlFor="targetChatId">Move notes to (optional)</Label>
          <Controller
            name="targetChatId"
            control={methods.control}
            render={({ field }) => (
              <Field>
                <ChatCombobox
                  id={field.name}
                  value={field.value}
                  onChange={field.onChange}
                  excludeChatId={chat.id}
                  showClear
                />
              </Field>
            )}
          />
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete chat</DialogTitle>
        </DialogHeader>
        <div className="mt-2">{renderBody()}</div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            variant="destructive"
            disabled={!isStatsReady || isSubmitting}
            onClick={() => void methods.handleSubmit(onSubmit)()}
          >
            {isSubmitting ? <Spinner /> : null}
            {targetChatId ? 'Move & delete' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
