import { Skeleton } from '@/shared/components/ui/skeleton';

const WIDTHS = ['w-40', 'w-56', 'w-32', 'w-64', 'w-48'];

interface Props {
  count?: number;
}

export const MessageListSkeleton = ({ count = 5 }: Props) => {
  return (
    <div className="w-full flex flex-col items-end space-y-2">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`relative rounded-lg ${WIDTHS[i % WIDTHS.length]}`}
        >
          <Skeleton className="h-7 w-full" />
        </div>
      ))}
    </div>
  );
};
