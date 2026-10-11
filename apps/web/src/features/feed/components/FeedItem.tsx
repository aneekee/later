import type { FeedItemEntity } from '@later/types';

import { TextWithLinks } from '@/features/inbox/components/messages/TextWithLinks';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
} from '@/shared/components/ui/card';
import { formatIsoDateTime } from '@/shared/utils/date.util';

import { formatRelativeTime } from '../utils/feed.utils';
import { FeedRating } from './FeedRating';

interface Props {
  item: FeedItemEntity;
}

export const FeedItem = ({ item }: Props) => {
  return (
    <Card className="gap-2">
      <CardHeader>
        <CardDescription className="flex min-w-0 items-center gap-1">
          <span className="truncate font-semibold text-foreground">
            {item.chatTitle}
          </span>
          <span aria-hidden="true">·</span>
          <time
            dateTime={item.createdAt}
            title={formatIsoDateTime(item.createdAt)}
            className="shrink-0"
          >
            {formatRelativeTime(item.createdAt)}
          </time>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="whitespace-pre-wrap wrap-anywhere">
          <TextWithLinks text={item.content} />
        </p>
      </CardContent>
      <CardFooter>
        <FeedRating item={item} />
      </CardFooter>
    </Card>
  );
};
