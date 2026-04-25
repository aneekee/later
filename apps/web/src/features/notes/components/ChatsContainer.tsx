import { useDispatch, useSelector } from 'react-redux';
import { RefreshCw } from 'lucide-react';

import { useChatsQuery } from '../api/chats.api';
import { CHATS_DEFAULT_PAGINATION } from '../const/chats.constants';
import { ChatItem } from './ChatItem';
import { ChatListEmpty } from './ChatListEmpty';
import { CreateChatDialog } from './create-chat/CreateChatDialog';
import { setActiveChatId } from '../slices/chats.slice';
import { selectActiveChatId } from '../selectors/chats.selectors';
import { ChatListError } from './ChatListError';
import { ChatListLoading } from './ChatListLoading';
import { Button } from '@/shared/components/ui/button';

export const ChatsContainer = () => {
  const dispatch = useDispatch();

  const activeChatId = useSelector(selectActiveChatId);

  const {
    data: chats,
    isFetching,
    isError,
    refetch,
  } = useChatsQuery(CHATS_DEFAULT_PAGINATION);

  const onChatClick = (chatId: string) => {
    dispatch(setActiveChatId({ chatId }));
  };

  const renderChatsContent = () => {
    if (isFetching) {
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
            isActive={activeChatId === c.id}
            date={c.createdAt}
            onClick={onChatClick}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="w-3xs h-full border-r overflow-auto text-sm">
      <div className="h-full flex flex-col">
        <div className="p-2 flex gap-2">
          <CreateChatDialog />
          <Button variant="outline" size="icon" onClick={() => void refetch()}>
            <RefreshCw className="size-4" />
          </Button>
        </div>
        <div className="p-2 flex grow items-start overflow-auto">
          {renderChatsContent()}
        </div>
      </div>
    </div>
  );
};
