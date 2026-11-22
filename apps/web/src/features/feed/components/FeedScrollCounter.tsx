import { Progress } from '@/shared/components/ui/progress';

interface Props {
  scrolled: number;
  total: number;
}

export const FeedScrollCounter = ({ scrolled, total }: Props) => {
  return (
    <div className="ml-2 flex min-w-0 flex-1 items-center gap-2">
      <Progress
        value={(scrolled / total) * 100}
        aria-hidden
        className="min-w-12 flex-1"
      />
      <span className="shrink-0 text-sm font-medium text-muted-foreground tabular-nums">
        {`${String(scrolled)}/${String(total)}`}
      </span>
    </div>
  );
};
