import { Card, CardContent, CardHeader } from '@/shared/components/ui/card';
import { Skeleton } from '@/shared/components/ui/skeleton';

interface Props {
  count?: number;
}

export const FeedSkeleton = ({ count = 3 }: Props) => {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} className="gap-2">
          <CardHeader>
            <Skeleton className="h-4 w-40" />
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>
      ))}
    </>
  );
};
