import { memo } from 'react';
import { MessageSquare } from 'lucide-react';

import type { ChatEntity } from '@later/types';

import { formatIsoDate } from '@/shared/utils/date.util';
import { cn } from '@/shared/lib/utils';

interface Props {
  chat: ChatEntity;
  isActive: boolean;
  onClick: (chat: ChatEntity) => void;
}

export const ChatItem = ({ chat, isActive, onClick }: Props) => {
  return (
    <div
      className={cn(
        'p-2 w-full flex gap-3 items-start rounded-lg transition-colors hover:bg-accent',
        isActive ? 'bg-accent' : '',
      )}
      onClick={() => onClick(chat)}
    >
      <div
        className={cn(
          'size-9 flex shrink-0 items-center justify-center rounded-lg',
          isActive
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-muted-foreground',
        )}
      >
        <MessageSquare className="size-4" />
      </div>
      <div className="flex flex-col grow overflow-hidden">
        <div className="flex gap-2 items-center justify-between">
          <p className="font-semibold text-nowrap overflow-hidden text-ellipsis">
            {chat.title}
          </p>
          {/* TODO: add a real last message date */}
          <p className="text-nowrap text-xs">{formatIsoDate(chat.createdAt)}</p>
        </div>
        {/* TODO: add a real last message preview */}
        <div>...</div>
      </div>
    </div>
  );
};

export const ChatItemMemo = memo(
  ChatItem,
  (prevProps, props) =>
    prevProps.chat.id === props.chat.id &&
    prevProps.chat.title === props.chat.title &&
    prevProps.chat.createdAt === props.chat.createdAt &&
    prevProps.isActive === props.isActive,
);
