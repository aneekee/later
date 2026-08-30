import { useState } from 'react';
import { useSelector } from 'react-redux';

import type { MessageResolutionFilter } from '@later/types';

import { selectActiveChat } from '../../selectors/chats.selectors';
import { MessagesNoActiveChat } from './MessagesNoActiveChat';
import { MessagesHeader } from './MessagesHeader';
import { MessageInput } from './MessageInput';
import { MessageListContainer } from './MessageListContainer';
import { ChatSearchPanel } from './ChatSearchPanel';
import { ResolvedNotesHeader } from './ResolvedNotesHeader';
import { ResolvedNotesListContainer } from './ResolvedNotesListContainer';
import { ResolvedChatSearchPanel } from './ResolvedChatSearchPanel';
import { RESOLVED_NOTES_CHAT } from '../../const/chats.constants';

export const MessagesContainer = () => {
  const activeChat = useSelector(selectActiveChat);

  // TODO: I need to split it into two separate components
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isResolvedSearchOpen, setIsResolvedSearchOpen] = useState(false);

  const [resolution, setResolution] =
    useState<MessageResolutionFilter>('unresolved');

  if (!activeChat) {
    return <MessagesNoActiveChat />;
  }

  if (activeChat.id === RESOLVED_NOTES_CHAT.id) {
    return (
      <div className="h-full flex flex-col overflow-hidden">
        <ResolvedNotesHeader
          isSearchOpen={isResolvedSearchOpen}
          onSearchToggle={() => setIsResolvedSearchOpen((prev) => !prev)}
        />
        {isResolvedSearchOpen ? <ResolvedChatSearchPanel /> : null}
        <div className="flex grow min-h-0">
          <ResolvedNotesListContainer chatId={activeChat.id} />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
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
      <div className="flex grow min-h-0">
        <MessageListContainer
          key={activeChat.id}
          chatId={activeChat.id}
          resolution={resolution}
        />
      </div>
      <footer className="p-3 shrink-0 border-t">
        <MessageInput key={activeChat.id} chatId={activeChat.id} />
      </footer>
    </div>
  );
};
