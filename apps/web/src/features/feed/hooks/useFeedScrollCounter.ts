import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from 'react';

import type { NoteEntity } from '@later/types';

import { FEED_SCROLL_OBSERVER_THRESHOLDS } from '../const/feed.constants';
import type { FeedScrollState } from '../types/feed.types';
import { countScrolledCard, isHalfVisible } from '../utils/feed.utils';

interface Params {
  scrollRef: RefObject<HTMLElement | null>;
  headerRef: RefObject<HTMLElement | null>;
  items: NoteEntity[];
  pageCount: number;
  latestPageTotal: number;
}

export const useFeedScrollCounter = ({
  scrollRef,
  headerRef,
  items,
  pageCount,
  latestPageTotal,
}: Params) => {
  const [state, setState] = useState<FeedScrollState>(() => ({
    counted: new Set(),
    round: 1,
  }));
  const [headerHeight, setHeaderHeight] = useState<number | null>(null);
  const [created, setCreated] = useState({ created: 0, pageCount });

  const createdSinceLatestPage =
    created.pageCount === pageCount ? created.created : 0;
  const total = latestPageTotal + createdSinceLatestPage;

  const itemIds = useMemo(() => new Set(items.map((item) => item.id)), [items]);
  const [prunedDeletedFor, setPrunedDeletedFor] = useState(itemIds);
  if (prunedDeletedFor !== itemIds) {
    setPrunedDeletedFor(itemIds);
    const hasDeletedCounted = [...state.counted].some(
      (noteId) => !itemIds.has(noteId),
    );
    if (hasDeletedCounted) {
      setState({
        ...state,
        counted: new Set(
          [...state.counted].filter((noteId) => itemIds.has(noteId)),
        ),
      });
    }
  }

  const totalRef = useRef(total);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const cardsRef = useRef(new Set<HTMLElement>());
  const qualifyingRef = useRef(new Set<string>());

  useEffect(() => {
    totalRef.current = total;
  }, [total]);

  useEffect(() => {
    const header = headerRef.current;
    if (!header) {
      return;
    }

    const resizeObserver = new ResizeObserver(() => {
      setHeaderHeight(header.offsetHeight);
    });

    resizeObserver.observe(header);
    return () => {
      resizeObserver.disconnect();
    };
  }, [headerRef]);

  useEffect(() => {
    if (headerHeight === null) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const newlyQualifying: string[] = [];

        entries.forEach((entry) => {
          const noteId = (entry.target as HTMLElement).dataset.noteId;
          if (!noteId) {
            return;
          }

          if (!isHalfVisible(entry)) {
            qualifyingRef.current.delete(noteId);
          } else if (!qualifyingRef.current.has(noteId)) {
            qualifyingRef.current.add(noteId);
            newlyQualifying.push(noteId);
          }
        });

        if (newlyQualifying.length) {
          setState((prev) =>
            newlyQualifying.reduce(
              (next, noteId) =>
                countScrolledCard(next, noteId, totalRef.current),
              prev,
            ),
          );
        }
      },
      {
        root: scrollRef.current,
        rootMargin: `-${String(headerHeight)}px 0px 0px 0px`,
        threshold: FEED_SCROLL_OBSERVER_THRESHOLDS,
      },
    );

    observerRef.current = observer;
    cardsRef.current.forEach((card) => {
      observer.observe(card);
    });

    return () => {
      observer.disconnect();
      observerRef.current = null;
    };
  }, [scrollRef, headerHeight]);

  const observeCard = useCallback((card: HTMLElement | null) => {
    if (!card) {
      return;
    }

    cardsRef.current.add(card);
    observerRef.current?.observe(card);

    return () => {
      cardsRef.current.delete(card);
      observerRef.current?.unobserve(card);
    };
  }, []);

  const noteCreated = useCallback(() => {
    setCreated((prev) => ({
      created: (prev.pageCount === pageCount ? prev.created : 0) + 1,
      pageCount,
    }));
  }, [pageCount]);

  const scrolled = [...state.counted].filter((noteId) =>
    itemIds.has(noteId),
  ).length;

  return {
    scrolled: Math.min(scrolled, total),
    total,
    round: state.round,
    observeCard,
    noteCreated,
  };
};
