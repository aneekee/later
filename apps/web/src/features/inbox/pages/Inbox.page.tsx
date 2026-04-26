import { useEffect } from 'react';
import { useDispatch } from 'react-redux';

import { ChatListContainer } from '../components/chats/ChatListContainer';
import { MessagesContainer } from '../components/messages/MessagesContainer';
import { setActiveChat } from '../slices/chats.slice';

export const InboxPage = () => {
  const dispatch = useDispatch();

  useEffect(
    () => () => {
      dispatch(setActiveChat({ chat: null }));
    },
    [dispatch],
  );

  return (
    <div className="h-full flex">
      <ChatListContainer />
      <div className="h-full grow">
        <MessagesContainer />
      </div>
    </div>
  );
};
