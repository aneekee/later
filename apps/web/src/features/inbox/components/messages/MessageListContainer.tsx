import { useEffect, useRef } from 'react';

import { useMessagesInfiniteQuery } from '../../api/messages.api';
import { MessageListEmpty } from './MessageListEmpty';
import { MessageListError } from './MessageListError';
import { MessageListLoading } from './MessageListLoading';
import { TextMessage } from './TextMessage';

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
          <TextMessage
            key={m.id}
            textContent={m.textMessage.content}
            date={m.createdAt}
          />
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
