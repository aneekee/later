import { useCallback, useMemo, useRef } from 'react';

import { Spinner } from '@/shared/components/ui/spinner';

import { useFeedInfiniteQuery } from '../api/feed.api';
import { FEED_PAGE_SIZE } from '../const/feed.constants';
import { useFeedScrollCounter } from '../hooks/useFeedScrollCounter';
import { dedupeKeepLast } from '../utils/feed.utils';
import { FeedEmpty } from './FeedEmpty';
import { FeedEnd } from './FeedEnd';
import { FeedError } from './FeedError';
import { FeedItem } from './FeedItem';
import { FeedLoadMoreError } from './FeedLoadMoreError';
import { FeedNoteInput } from './FeedNoteInput';
import { FeedScrollCounter } from './FeedScrollCounter';
import { FeedSentinel } from './FeedSentinel';
import { FeedSkeleton } from './FeedSkeleton';

export const FeedContainer = () => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);

  const {
    data,
    isLoading,
    isError,
    isFetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useFeedInfiniteQuery({ pageSize: FEED_PAGE_SIZE });

  const items = useMemo(() => dedupeKeepLast(data?.pages ?? []), [data]);

  const pageCount = data?.pages.length ?? 0;
  const hasPages = pageCount > 0;

  const { scrolled, total, round, observeCard, noteCreated } =
    useFeedScrollCounter({
      scrollRef,
      headerRef,
      items,
      pageCount,
      total: data?.pages.at(-1)?.data?.total ?? 0,
    });
  // the loaded pages are never refetched, so an error with pages is a next page error
  const isFetchNextPageError = isError && hasPages;

  // one request at a time; a failed page is retried by the button only
  const onSentinelVisible = useCallback(() => {
    if (hasNextPage && !isFetching && !isFetchNextPageError) {
      void fetchNextPage();
    }
  }, [hasNextPage, isFetching, isFetchNextPageError, fetchNextPage]);

  const renderContent = () => {
    if (isLoading) {
      return <FeedSkeleton />;
    }

    // refetch is safe only while no pages are loaded
    if (isError && !hasPages) {
      return <FeedError onRetry={() => void refetch()} />;
    }

    // all loaded notes may be deleted while more exist, keep loading then
    if (!items.length && !hasNextPage) {
      return <FeedEmpty />;
    }

    return (
      <>
        {items.map((item) => (
          <FeedItem key={item.id} ref={observeCard} item={item} />
        ))}
        {isFetchingNextPage && (
          <div className="flex justify-center py-4">
            <Spinner />
          </div>
        )}
        {isFetchNextPageError && (
          <FeedLoadMoreError onRetry={() => void fetchNextPage()} />
        )}
        {!hasNextPage && <FeedEnd />}
        <FeedSentinel rootRef={scrollRef} onVisible={onSentinelVisible} />
      </>
    );
  };

  return (
    <div ref={scrollRef} className="h-full overflow-y-auto">
      <div className="mx-auto flex min-h-full w-full max-w-150 flex-col">
        <header
          ref={headerRef}
          className="sticky top-0 z-10 flex shrink-0 flex-col bg-background/80 px-3 pb-3 backdrop-blur md:px-4"
        >
          <div className="flex h-12 items-center justify-between gap-3 px-1 md:px-0">
            <h1 className="text-lg font-semibold">Feed</h1>
            {hasPages && total > 0 && (
              <FeedScrollCounter
                scrolled={scrolled}
                total={total}
                round={round}
              />
            )}
          </div>
          <FeedNoteInput onCreated={noteCreated} />
        </header>
        <div className="flex flex-1 flex-col gap-3 px-3 pt-1 pb-3 md:px-4">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};
