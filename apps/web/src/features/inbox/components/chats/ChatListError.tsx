import { AlertCircle, RefreshCw } from 'lucide-react';

import { Button } from '@/shared/components/ui/button';

interface Props {
  onRetry: () => void;
}

export const ChatListError = ({ onRetry }: Props) => {
  return (
    <div className="flex flex-col items-center justify-center gap-4 px-4 py-12 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
        <AlertCircle className="size-6 text-destructive" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">
          Failed to load chats
        </p>
        <p className="text-xs text-muted-foreground">
          Something went wrong. Please try again.
        </p>
      </div>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RefreshCw className="size-4" />
        Retry
      </Button>
    </div>
  );
};
