import { useSelector } from 'react-redux';

import { selectActiveChatId } from '../../selectors/chats.selectors';
import { MessagesNoActiveChat } from './MessagesNoActiveChat';

export const MessagesContainer = () => {
  const activeChatId = useSelector(selectActiveChatId);
  if (!activeChatId) {
    return <MessagesNoActiveChat />;
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-2 border-b">header</div>
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
      <div className="p-2 border-t">input</div>
    </div>
  );
};
