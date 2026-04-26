import { useEffect, useRef } from 'react';

import {
  useDeleteMessageMutation,
  useMessagesInfiniteQuery,
} from '../../api/messages.api';
import { MessageListEmpty } from './MessageListEmpty';
import { MessageListError } from './MessageListError';
import { MessageListLoading } from './MessageListLoading';
import { TextMessage } from './TextMessage';
import { WithMessageContextMenu } from './WithMessageContextMenu';
import { useDisplayErrorToast } from '@/shared/hooks/useDisplayErrorToast';

interface Props {
  chatId: string;
}

export const MessageListContainer = ({ chatId }: Props) => {
  const { data, isLoading, isError, refetch, fetchNextPage, hasNextPage } =
    useMessagesInfiniteQuery({
      chatId,
      page: 1,
      pageSize: 20,
    });

  const [deleteMessage] = useDeleteMessageMutation();

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
      <div className="w-full flex flex-col-reverse items-end gap-2 overflow-auto">
        {messagesList.map((m) => (
          <WithMessageContextMenu
            onCopyClick={() => onCopyClick(m.textMessage.content)}
            onDeleteClick={() => void onDeleteClick(m.id)}
          >
            <TextMessage
              key={m.id}
              textContent={m.textMessage.content}
              date={m.createdAt}
            />
          </WithMessageContextMenu>
        ))}
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
