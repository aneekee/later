import { useEffect, useRef } from 'react';

import type { ResolvedMessageEntity } from '@later/types';

import { Spinner } from '@/shared/components/ui/spinner';
import { useDisplayErrorToast } from '@/shared/hooks/useDisplayErrorToast';
import { cn } from '@/shared/lib/utils';
import { getReadableDate, isOnDifferentDay } from '@/shared/utils/date.util';

import {
  useDeleteResolvedMessageMutation,
  useResolvedMessagesInfiniteQuery,
  useUnresolveResolvedMessageMutation,
} from '../../api/resolvedMessages.api';
import { ResolvedMessageListEmpty } from './ResolvedMessageListEmpty';
import { MessageListError } from './MessageListError';
import { MessageListLoading } from './MessageListLoading';
import { TextMessage } from './TextMessage';
import { WithMessageContextMenu } from './WithMessageContextMenu';
import { MessageDateSeparator } from './MessageDateSeparator';
import { WithMessageItemResolution } from './WithMessageItemResolution';

interface Props {
  chatId: string;
}

export const ResolvedNotesListContainer = ({ chatId }: Props) => {
  const {
    data,
    isLoading,
    isFetching,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
  } = useResolvedMessagesInfiniteQuery({ chatId, page: 1, pageSize: 20 });

  const [deleteMessage] = useDeleteResolvedMessageMutation();
  const [unresolveMutation] = useUnresolveResolvedMessageMutation();

  const { displayErrorToast } = useDisplayErrorToast();

  const topSentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = topSentinelRef.current;
    if (!sentinel) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !isLoading && hasNextPage) {
          void fetchNextPage();
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(sentinel);
    return () => {
      observer.disconnect();
    };
  }, [fetchNextPage, isLoading, hasNextPage]);

  const onCopyClick = (textContent: string) => {
    void window.navigator.clipboard.writeText(textContent);
  };

  const onUnresolveClick = async (
    chatId: string,
    messageId: string,
    resolutionId: string,
  ) => {
    try {
      await unresolveMutation({ chatId, messageId, resolutionId }).unwrap();
    } catch (error) {
      console.error(error);
      displayErrorToast(error, 'Unresolve failed');
    }
  };

  const onDeleteClick = async (chatId: string, messageId: string) => {
    try {
      await deleteMessage({ chatId, messageId }).unwrap();
    } catch (error) {
      console.error(error);
      displayErrorToast(error, 'Message delete failed');
    }
  };

  const renderMessagesContent = () => {
    if (isLoading) {
      return <MessageListLoading />;
    }

    if (isError) {
      return <MessageListError onRetry={() => void refetch()} />;
    }

    const messagesList = (data?.pages.flat() ?? [])
      .map((r) => r.data?.list ?? [])
      .reduce<ResolvedMessageEntity[]>((acc, item) => acc.concat(item), []);

    if (!messagesList.length) {
      return <ResolvedMessageListEmpty />;
    }

    return (
      <div className="px-3 py-2 w-full flex flex-col-reverse items-end gap-2 overflow-auto">
        {messagesList.map((m, index, array) => {
          const nextMessage = array[index + 1] as
            | ResolvedMessageEntity
            | undefined;
          const showSeparator =
            index === array.length - 1 ||
            (nextMessage &&
              isOnDifferentDay(m.createdAt, nextMessage.createdAt));

          return (
            <div key={m.id} className="w-full flex flex-col gap-2 items-end">
              {showSeparator ? (
                <MessageDateSeparator title={getReadableDate(m.createdAt)} />
              ) : null}
              <div
                className={cn(m.id.startsWith('MOCK-ID') ? 'opacity-50' : '')}
              >
                <p className="text-xs text-muted-foreground mb-1 text-right">
                  {m.chat.title}
                </p>
                <WithMessageContextMenu
                  onUnresolveClick={
                    m.messageResolution
                      ? () =>
                          void onUnresolveClick(
                            m.chat.id,
                            m.id,
                            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                            m.messageResolution!.id,
                          )
                      : undefined
                  }
                  onCopyClick={() => onCopyClick(m.textMessage.content)}
                  onDeleteClick={() => void onDeleteClick(m.chat.id, m.id)}
                >
                  <WithMessageItemResolution
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    messageResolution={m.messageResolution!}
                  >
                    <TextMessage
                      textContent={m.textMessage.content}
                      date={m.createdAt}
                    />
                  </WithMessageItemResolution>
                </WithMessageContextMenu>
              </div>
            </div>
          );
        })}
        <div
          className={cn(
            'w-full flex justify-center',
            !isFetching && 'invisible',
          )}
        >
          <Spinner />
        </div>
        <div ref={topSentinelRef} />
      </div>
    );
  };

  return (
    <div className="w-full flex grow overflow-hidden">
      {renderMessagesContent()}
    </div>
  );
};
