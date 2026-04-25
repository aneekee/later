import { Send } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { useDisplayErrorToast } from '@/shared/hooks/useDisplayErrorToast';

import { useCreateTextMessageMutation } from '../../api/messages.api';

interface Props {
  chatId: string;
}

export const MessageInput = ({ chatId }: Props) => {
  const [message, setMessage] = useState('');

  const [createMessage] = useCreateTextMessageMutation();

  const { displayErrorToast } = useDisplayErrorToast();

  const onMessageSubmit = async () => {
    try {
      await createMessage({
        chatId,
        body: { content: message },
      }).unwrap();

      setMessage('');
    } catch (e) {
      console.error(e);
      displayErrorToast(e, 'Error of creating a message');
    }
  };

  return (
    <div className="flex gap-2 items-center">
      <div className="grow">
        <Input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if (message.trim()) {
                void onMessageSubmit();
              }
            }
          }}
          maxLength={255}
        />
      </div>
      <div>
        <Button
          type="submit"
          size="icon"
          className="size-9 shrink-0"
          disabled={!message.trim()}
          onClick={() => void onMessageSubmit()}
        >
          <Send className="size-4" />
        </Button>
      </div>
    </div>
  );
};
