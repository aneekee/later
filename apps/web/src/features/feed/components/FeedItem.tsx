import { Link } from 'react-router';

import type { FeedItemEntity } from '@later/types';

import { TextWithLinks } from '@/features/inbox/components/messages/TextWithLinks';
import { formatIsoDateTime } from '@/shared/utils/date.util';

import { formatRelativeTime } from '../utils/feed.utils';

interface Props {
  item: FeedItemEntity;
}

export const FeedItem = ({ item }: Props) => {
  return (
    <article className="flex flex-col gap-2 border-b px-4 py-3">
      <header className="flex min-w-0 items-center gap-1 text-sm">
        <Link
          to={`/inbox?chatId=${item.chatId}`}
          className="truncate font-semibold hover:underline"
        >
          {item.chatTitle}
        </Link>
        <span className="text-muted-foreground" aria-hidden="true">
          ·
        </span>
        <time
          dateTime={item.createdAt}
          title={formatIsoDateTime(item.createdAt)}
          className="shrink-0 text-muted-foreground"
        >
          {formatRelativeTime(item.createdAt)}
        </time>
      </header>
      <p className="text-sm whitespace-pre-wrap wrap-anywhere">
        <TextWithLinks text={item.content} />
      </p>
      {/* controls slot */}
      <footer className="flex items-center gap-2 empty:hidden" />
    </article>
  );
};
