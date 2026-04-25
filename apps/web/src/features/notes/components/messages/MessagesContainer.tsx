import { useSelector } from 'react-redux';

import { selectActiveChat } from '../../selectors/chats.selectors';
import { MessagesNoActiveChat } from './MessagesNoActiveChat';
import { MessagesHeader } from './MessagesHeader';
import { MessageInput } from './MessageInput';

export const MessagesContainer = () => {
  const activeChat = useSelector(selectActiveChat);
  if (!activeChat) {
    return <MessagesNoActiveChat />;
  }

  return (
    <div className="h-full flex flex-col">
      <MessagesHeader title={activeChat.title} />
      <div className="h-1 grow overflow-auto">
        <div>messages list</div>
        <div>messages list</div>
        <div>messages list</div>
        <div>messages list</div>
        <div>messages list</div>
        <div>messages list</div>
        <div>messages list</div>
        <div>messages list</div>
        <div>messages list</div>
        <div>messages list</div>
        <div>messages list</div>
        <div>messages list</div>
        <div>messages list</div>
        <div>messages list</div>
        <div>messages list</div>
        <div>messages list</div>
        <div>messages list</div>
        <div>messages list</div>
        <div>messages list</div>
        <div>messages list</div>
        <div>messages list</div>
        <div>messages list</div>
        <div>messages list</div>
        <div>messages list</div>
        <div>messages list</div>
        <div>messages list</div>
        <div>messages list</div>
        <div>messages list</div>
        <div>messages list</div>
        <div>messages list</div>
        <div>messages list</div>
        <div>messages list</div>
        <div>messages list</div>
        <div>messages list</div>
        <div>messages list</div>
        <div>messages list</div>
        <div>messages list</div>
        <div>messages list</div>
        <div>messages list</div>
        <div>messages list</div>
        <div>messages list</div>
        <div>messages list</div>
        <div>messages list</div>
      </div>
      <footer className="p-3 border-t">
        <MessageInput key={activeChat.id} chatId={activeChat.id} />
      </footer>
    </div>
  );
};
