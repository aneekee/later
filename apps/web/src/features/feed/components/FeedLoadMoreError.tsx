import { RefreshCw } from 'lucide-react';

import { Button } from '@/shared/components/ui/button';

interface Props {
  onRetry: () => void;
}

export const FeedLoadMoreError = ({ onRetry }: Props) => {
  return (
    <div className="flex items-center justify-center gap-3 px-4 py-4 text-sm text-muted-foreground">
      <span>Couldn&apos;t load more</span>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RefreshCw className="size-4" />
        Retry
      </Button>
    </div>
  );
};
