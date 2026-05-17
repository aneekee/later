import { useEffect, useRef } from 'react';

import type { TextMessageEntity } from '@later/types';

import { Spinner } from '@/shared/components/ui/spinner';
import { useDisplayErrorToast } from '@/shared/hooks/useDisplayErrorToast';
import { cn } from '@/shared/lib/utils';
import { getReadableDate, isOnDifferentDay } from '@/shared/utils/date.util';

import {
  useDeleteMessageMutation,
  useMessagesInfiniteQuery,
  useResolveMessageMutation,
} from '../../api/messages.api';
import { MessageListEmpty } from './MessageListEmpty';
import { MessageListError } from './MessageListError';
import { MessageListLoading } from './MessageListLoading';
import { TextMessage } from './TextMessage';
import { WithMessageContextMenu } from './WithMessageContextMenu';
import { WithMessageItemResolution } from './WithMessageItemResolution';
import { MessageDateSeparator } from './MessageDateSeparator';

interface Props {
  chatId: string;
}

// @TODO: fix messages list rerendering
export const MessageListContainer = ({ chatId }: Props) => {
  const {
    data,
    isLoading,
    isFetching,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
  } = useMessagesInfiniteQuery({
    chatId,
    page: 1,
    pageSize: 20,
  });

  const [deleteMessage] = useDeleteMessageMutation();
  const [resolveMessage] = useResolveMessageMutation();

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

  const onResolveClick = (id: string) => {};

  const onQuickResolveClick = async (id: string) => {
    try {
      await resolveMessage({ chatId, messageId: id }).unwrap();
    } catch (error) {
      console.error(error);
      displayErrorToast(error, 'Quick resolve failed');
    }
  };

  const onDeleteClick = async (id: string) => {
    try {
      await deleteMessage({ chatId, messageId: id }).unwrap();
    } catch (error) {
      console.error(error);
      displayErrorToast(error, 'Message delete failed');
    }
  };

  const renderMessagesContent = () => {
    // TODO: handle loading for fethcing another page
    if (isLoading) {
      return <MessageListLoading />;
    }

    if (isError) {
      return <MessageListError onRetry={() => void refetch()} />;
    }

    const messagesList = (data?.pages.flat() ?? [])
      .map((r) => r.data?.list ?? [])
      .reduce((acc, item) => acc.concat(item), []);

    if (!messagesList.length) {
      return <MessageListEmpty />;
    }

    return (
      // TODO: refactor, consider moving to a separate component -- this one is too complex
      // also, add a memo wrapper
      <div className="px-3 py-2 w-full flex flex-col-reverse items-end gap-2 overflow-auto">
        {messagesList.map((m, index, array) => {
          const nextMessage = array[index + 1] as TextMessageEntity | undefined;
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
                className={cn(
                  'max-w-lg',
                  m.id.startsWith('MOCK-ID') ? 'opacity-50' : '',
                )}
              >
                <WithMessageContextMenu
                  onResolveClick={() => onResolveClick(m.id)}
                  onQuickResolveClick={() => void onQuickResolveClick(m.id)}
                  onCopyClick={() => onCopyClick(m.textMessage.content)}
                  onDeleteClick={() => void onDeleteClick(m.id)}
                >
                  {m.messageResolution ? (
                    <WithMessageItemResolution
                      messageResolution={m.messageResolution}
                    >
                      <TextMessage
                        textContent={m.textMessage.content}
                        date={m.createdAt}
                      />
                    </WithMessageItemResolution>
                  ) : (
                    <TextMessage
                      textContent={m.textMessage.content}
                      date={m.createdAt}
                    />
                  )}
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
