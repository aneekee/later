import { ChatListContainer } from '../components/chats/ChatListContainer';
import { MessagesContainer } from '../components/messages/MessagesContainer';

export const NotesPage = () => {
  return (
    <div className="h-full flex">
      <ChatListContainer />
      <div className="h-full grow">
        <MessagesContainer />
      </div>
    </div>
  );
};
