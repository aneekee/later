import { useMessagesQuery } from '../../api/messages.api';
import { MessageListEmpty } from './MessageListEmpty';
import { MessageListError } from './MessageListError';
import { TextMessage } from './TextMessage';

interface Props {
  chatId: string;
}

export const MessageListContainer = ({ chatId }: Props) => {
  const { data, isFetching, isError, refetch } = useMessagesQuery({
    chatId,
    page: 1,
    pageSize: 20,
  });

  const renderMessagesContent = () => {
    if (isFetching) {
      return <div>Loading...</div>;
    }

    if (isError) {
      return <MessageListError onRetry={() => void refetch()} />;
    }

    if (!data?.data?.list.length) {
      return <MessageListEmpty />;
    }

    return (
      <div className="w-full flex flex-col items-end space-y-2">
        {data.data.list.map((m) => (
          <TextMessage
            key={m.id}
            textContent={m.textMessage.content}
            date={m.createdAt}
          />
        ))}
      </div>
    );
  };

  return <div className="w-full flex grow">{renderMessagesContent()}</div>;
};
