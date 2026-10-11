import { Link } from 'react-router';
import { Newspaper } from 'lucide-react';

import { Button } from '@/shared/components/ui/button';

export const FeedEmpty = () => {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="flex flex-col items-center gap-4 text-center max-w-xs">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted">
          <Newspaper className="size-6 text-muted-foreground" />
        </div>
        <div className="space-y-1.5">
          <h3 className="text-sm font-medium text-foreground">
            Nothing to revisit
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Your inbox is clear.
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link to="/inbox">Go to inbox</Link>
        </Button>
      </div>
    </div>
  );
};
