import { AlertCircle, RefreshCw } from 'lucide-react';

import { Button } from '@/shared/components/ui/button';

interface Props {
  onRetry: () => void;
}

export const MessageListError = ({ onRetry }: Props) => {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="flex flex-col items-center gap-4 text-center max-w-xs">
        <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
          <AlertCircle className="size-6 text-destructive" />
        </div>
        <div className="space-y-1.5">
          <h3 className="text-sm font-medium text-foreground">
            Failed to load messages
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            We couldn&apos;t load the conversation. Please check your connection
            and try again.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="size-4" />
          Try again
        </Button>
      </div>
    </div>
  );
};
