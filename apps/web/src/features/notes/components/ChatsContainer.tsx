import { useDispatch, useSelector } from 'react-redux';

import { useChatsQuery } from '../api/chats.api';
import { CHATS_DEFAULT_PAGINATION } from '../const/chats.constants';
import { ChatItem } from './ChatItem';
import { ChatsEmptyState } from './ChatsEmptyState';
import { CreateChatDialog } from './create-chat/CreateChatDialog';
import { setActiveChatId } from '../slices/chats.slice';
import { selectActiveChatId } from '../selectors/chats.selectors';

export const ChatsContainer = () => {
  const dispatch = useDispatch();

  const activeChatId = useSelector(selectActiveChatId);

  const {
    data: chats,
    isFetching,
    isError,
  } = useChatsQuery(CHATS_DEFAULT_PAGINATION);

  const onChatClick = (chatId: string) => {
    dispatch(setActiveChatId({ chatId }));
  };

  const renderChatsContent = () => {
    if (isFetching) {
      return <div>Loading...</div>;
    }

    if (isError) {
      return <div>Error of fetching chats</div>;
    }

    if (!chats?.data?.list.length) {
      return <ChatsEmptyState />;
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
        <div className="p-2">
          <CreateChatDialog />
        </div>
        <div className="p-2 flex grow overflow-auto">
          {renderChatsContent()}
        </div>
      </div>
    </div>
  );
};
