import { AlertCircle, RefreshCw } from 'lucide-react';

import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/lib/utils';

interface Props {
  title: string;
  onRetry: () => void;
  className?: string;
}

export const StatsError = ({ title, onRetry, className }: Props) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-lg border p-6 text-center',
        className,
      )}
    >
      <AlertCircle className="size-5 text-destructive" />
      <p className="text-sm text-muted-foreground">{title}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RefreshCw className="size-4" />
        Try again
      </Button>
    </div>
  );
};
