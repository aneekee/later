import { formatIsoDate } from '@/shared/lib/date.util';
import { cn } from '@/shared/lib/utils';
import { MessageSquare } from 'lucide-react';

interface Props {
  id: string;
  title: string;
  isActive: boolean;
  date: string;
  onClick: (id: string) => void;
}

export const ChatItem = ({ id, title, isActive, date, onClick }: Props) => {
  return (
    <div
      className={cn(
        'p-2 w-full flex gap-3 items-start rounded-lg transition-colors hover:bg-accent',
        isActive ? 'bg-accent' : '',
      )}
      onClick={() => onClick(id)}
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
            {title}
          </p>
          {/* TODO: add a real last message date */}
          <p className="text-nowrap text-xs">{formatIsoDate(date)}</p>
        </div>
        {/* TODO: add a real last message preview */}
        <div>...</div>
      </div>
    </div>
  );
};
