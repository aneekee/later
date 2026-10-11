import { Skeleton } from '@/shared/components/ui/skeleton';

interface Props {
  count?: number;
}

export const FeedSkeleton = ({ count = 3 }: Props) => {
  return (
    <div className="flex flex-col">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col gap-3 border-b px-4 py-3">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      ))}
    </div>
  );
};
