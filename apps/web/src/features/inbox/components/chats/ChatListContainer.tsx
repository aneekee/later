import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams } from 'react-router';
import { RefreshCw } from 'lucide-react';

import type { ChatEntity } from '@later/types';

import { Spinner } from '@/shared/components/ui/spinner';
import { Button } from '@/shared/components/ui/button';

import { ChatItem } from './ChatItem';
import { ChatListEmpty } from './ChatListEmpty';
import { CreateChatDialog } from './create-chat/CreateChatDialog';
import { ChatListError } from './ChatListError';
import { ChatListLoading } from './ChatListLoading';
import { selectActiveChat } from '../../selectors/chats.selectors';
import { useChatsQuery } from '../../api/chats.api';
import { CHATS_DEFAULT_PAGINATION } from '../../const/chats.constants';
import { setActiveChat } from '../../slices/chats.slice';

// TODO: investigate the chats list rerenders -- it should not rerender the whole list on new message
export const ChatListContainer = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const dispatch = useDispatch();
  const activeChat = useSelector(selectActiveChat);

  const {
    data: chats,
    isFetching,
    isLoading,
    isError,
    refetch,
  } = useChatsQuery(CHATS_DEFAULT_PAGINATION);

  useEffect(() => {
    if (!chats?.data?.list) {
      return;
    }

    const chatId = searchParams.get('chatId');
    if (!chatId) {
      return;
    }

    const chat = chats.data.list.find((c) => c.id === chatId);
    if (chat) {
      dispatch(setActiveChat({ chat }));
    }
  }, [chats?.data?.list, searchParams, dispatch]);

  const onChatClick = (chat: ChatEntity) => {
    setSearchParams({ chatId: chat.id });
    dispatch(setActiveChat({ chat }));
  };

  const renderChatsContent = () => {
    if (isLoading) {
      return <ChatListLoading />;
    }

    if (isError) {
      return <ChatListError onRetry={() => void refetch()} />;
    }

    if (!chats?.data?.list.length) {
      return <ChatListEmpty />;
    }

    return (
      <div className="w-full">
        {chats.data.list.map((c) => (
          <ChatItem
            key={c.id}
            id={c.id}
            title={c.title}
            isActive={activeChat?.id === c.id}
            date={c.createdAt}
            onClick={() => onChatClick(c)}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="w-3xs h-full shrink-0 border-r overflow-auto text-sm">
      <div className="h-full flex flex-col">
        <div className="p-2 flex justify-between">
          <div className="flex gap-2">
            {chats?.data?.list && chats.data.list.length < 10 ? (
              <CreateChatDialog />
            ) : null}
            <Button
              variant="outline"
              size="icon"
              onClick={() => void refetch()}
            >
              <RefreshCw className="size-4" />
            </Button>
          </div>
          {isFetching ? <Spinner className="self-center" /> : null}
        </div>
        <div className="p-2 flex grow items-start overflow-auto">
          {renderChatsContent()}
        </div>
      </div>
    </div>
  );
};
