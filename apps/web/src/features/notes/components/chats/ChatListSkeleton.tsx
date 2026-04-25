import { Skeleton } from '@/shared/components/ui/skeleton';

interface Props {
  count: number;
}

export const ChatListSkeleton = ({ count }: Props) => {
  return (
    <div className="w-full flex flex-col gap-1">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-2 w-full flex gap-3 items-start rounded-lg">
          <Skeleton className="size-9 rounded-lg shrink-0" />
          <div className="flex flex-col grow overflow-hidden gap-1">
            <div className="flex gap-2 items-center justify-between">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-10 shrink-0" />
            </div>
            <Skeleton className="h-4 w-full max-w-45" />
          </div>
        </div>
      ))}
    </div>
  );
};
