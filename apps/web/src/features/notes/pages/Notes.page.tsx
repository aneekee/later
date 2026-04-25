import { ChatsContainer } from '../components/chats/ChatsContainer';
import { MessagesContainer } from '../components/messages/MessagesContainer';

export const NotesPage = () => {
  return (
    <div className="h-full flex">
      <ChatsContainer />
      <div className="p-2 h-full overflow-hidden grow">
        <MessagesContainer />
      </div>
    </div>
  );
};
