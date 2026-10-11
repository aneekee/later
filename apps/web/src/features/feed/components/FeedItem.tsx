import { useState } from 'react';
import { Trash2Icon } from 'lucide-react';

import type { FeedItemEntity } from '@later/types';

import { TextWithLinks } from '@/features/inbox/components/messages/TextWithLinks';
import { Button } from '@/shared/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
} from '@/shared/components/ui/card';
import { formatIsoDateTime } from '@/shared/utils/date.util';

import { useBatchedRating } from '../hooks/useBatchedRating';
import { formatRelativeTime } from '../utils/feed.utils';
import { DeleteFeedNoteDialog } from './DeleteFeedNoteDialog';
import { FeedRating } from './FeedRating';

interface Props {
  item: FeedItemEntity;
}

export const FeedItem = ({ item }: Props) => {
  const { rating, change, cancel } = useBatchedRating(item);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

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
      <CardFooter className="justify-between">
        <FeedRating rating={rating} change={change} />
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Delete note"
          title="Delete note"
          className="text-destructive hover:bg-destructive/10 hover:text-destructive dark:hover:bg-destructive/20"
          onClick={() => setIsDeleteOpen(true)}
        >
          <Trash2Icon />
        </Button>
      </CardFooter>
      {isDeleteOpen && (
        <DeleteFeedNoteDialog
          item={item}
          open={isDeleteOpen}
          onOpenChange={setIsDeleteOpen}
          onBeforeDelete={cancel}
        />
      )}
    </Card>
  );
};
