import { useState } from 'react';
import { useSelector } from 'react-redux';

import type { MessageResolutionFilter } from '@later/types';

import { selectActiveChat } from '../../selectors/chats.selectors';
import { MessagesNoActiveChat } from './MessagesNoActiveChat';
import { MessagesHeader } from './MessagesHeader';
import { MessageInput } from './MessageInput';
import { MessageListContainer } from './MessageListContainer';
import { ChatSearchPanel } from './ChatSearchPanel';

export const MessagesContainer = () => {
  const activeChat = useSelector(selectActiveChat);

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [resolution, setResolution] =
    useState<MessageResolutionFilter>('unresolved');

  if (!activeChat) {
    return <MessagesNoActiveChat />;
  }

  return (
    <div className="h-full flex flex-col">
      <MessagesHeader
        title={activeChat.title}
        isSearchOpen={isSearchOpen}
        onSearchToggle={() => setIsSearchOpen((prev) => !prev)}
      />
      {isSearchOpen ? (
        <ChatSearchPanel
          resolution={resolution}
          onResolutionChange={setResolution}
        />
      ) : null}
      <div className="h-1 flex grow">
        <MessageListContainer
          key={activeChat.id}
          chatId={activeChat.id}
          resolution={resolution}
        />
      </div>
      <footer className="p-3 border-t">
        <MessageInput key={activeChat.id} chatId={activeChat.id} />
      </footer>
    </div>
  );
};
