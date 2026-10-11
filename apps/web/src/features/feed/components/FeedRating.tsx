import { ArrowBigDownIcon, ArrowBigUpIcon } from 'lucide-react';

import type { FeedItemEntity } from '@later/types';

import { Button } from '@/shared/components/ui/button';
import { cn } from '@/shared/lib/utils';

import { FEED_RATING_MAX, FEED_RATING_MIN } from '../const/feed.constants';
import { useBatchedRating } from '../hooks/useBatchedRating';
import { useHoldRepeat } from '../hooks/useHoldRepeat';

interface Props {
  item: FeedItemEntity;
}

const BUTTON_CLASS_NAME = 'touch-manipulation [-webkit-touch-callout:none]';

export const FeedRating = ({ item }: Props) => {
  const { rating, change } = useBatchedRating(item);

  const canUpvote = rating < FEED_RATING_MAX;
  const canDownvote = rating > FEED_RATING_MIN;

  const upvoteHandlers = useHoldRepeat(() => change(1), !canUpvote);
  const downvoteHandlers = useHoldRepeat(() => change(-1), !canDownvote);

  return (
    <div className="flex items-center gap-0.5">
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Upvote"
        title="Upvote, hold to repeat"
        disabled={!canUpvote}
        className={BUTTON_CLASS_NAME}
        {...upvoteHandlers}
      >
        <ArrowBigUpIcon />
      </Button>
      <span
        className={cn(
          'min-w-6 text-center text-sm font-semibold tabular-nums',
          rating > 0
            ? 'text-emerald-600 dark:text-emerald-400'
            : 'text-muted-foreground',
        )}
      >
        {rating}
      </span>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Downvote"
        title="Downvote, hold to repeat"
        disabled={!canDownvote}
        className={BUTTON_CLASS_NAME}
        {...downvoteHandlers}
      >
        <ArrowBigDownIcon />
      </Button>
    </div>
  );
};
