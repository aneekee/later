import { CheckSquare } from 'lucide-react';

import { cn } from '@/shared/lib/utils';

interface Props {
  isActive: boolean;
  onClick: () => void;
}

export const ResolvedNotesItem = ({ isActive, onClick }: Props) => {
  return (
    <div
      className={cn(
        'p-2 w-full flex gap-3 items-start rounded-lg transition-colors hover:bg-accent',
        isActive ? 'bg-accent' : '',
      )}
      onClick={onClick}
    >
      <div
        className={cn(
          'size-9 flex shrink-0 items-center justify-center rounded-lg',
          isActive
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-muted-foreground',
        )}
      >
        <CheckSquare className="size-4" />
      </div>
      <div className="flex flex-col grow overflow-hidden justify-center h-9">
        <p className="font-semibold">Resolved Notes</p>
      </div>
    </div>
  );
};
