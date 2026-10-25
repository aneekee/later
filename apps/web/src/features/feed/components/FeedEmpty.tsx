import { Newspaper } from 'lucide-react';

export const FeedEmpty = () => {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="flex flex-col items-center gap-4 text-center max-w-xs">
        <div className="flex size-12 items-center justify-center rounded-full bg-muted">
          <Newspaper className="size-6 text-muted-foreground" />
        </div>
        <div className="space-y-1.5">
          <h3 className="text-sm font-medium text-foreground">No notes yet</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Write your first note above.
          </p>
        </div>
      </div>
    </div>
  );
};
