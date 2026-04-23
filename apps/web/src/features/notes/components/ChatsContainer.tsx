import { useChatsQuery } from '../api/chats.api';
import { CHATS_DEFAULT_PAGINATION } from '../const/chats.constants';
import { ChatsEmptyState } from './ChatsEmptyState';
import { CreateChatDialog } from './create-chat/CreateChatDialog';

export const ChatsContainer = () => {
  const {
    data: chats,
    isFetching,
    isError,
  } = useChatsQuery(CHATS_DEFAULT_PAGINATION);

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
      <ul>
        {chats.data.list.map((c) => (
          <li key={c.id}>{c.title}</li>
        ))}
      </ul>
    );
  };

  return (
    <div className="w-3xs h-full bg-gray-50 border-r overflow-auto">
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
