import { useSelector } from 'react-redux';

import { selectActiveChatId } from '../../selectors/chats.selectors';
import { MessagesNoActiveChat } from './MessagesNoActiveChat';

export const MessagesContainer = () => {
  const activeChatId = useSelector(selectActiveChatId);

  if (!activeChatId) {
    return <MessagesNoActiveChat />;
  }

  return <div>MessagesContainer</div>;
};
