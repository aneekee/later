import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from 'react';

import type { NoteEntity } from '@later/types';

import type { FeedScrollState } from '../types/feed.types';
import { countScrolledCard } from '../utils/feed.utils';

// every 2%, so the callback fires as a card's visibility changes
const THRESHOLDS = Array.from({ length: 51 }, (_, i) => i / 50);

interface Params {
  scrollRef: RefObject<HTMLElement | null>;
  headerRef: RefObject<HTMLElement | null>;
  // the loaded feed items, deduped
  items: NoteEntity[];
  // the number of loaded feed pages
  pageCount: number;
  // the latest page's total
  total: number;
}

const qualifies = (entry: IntersectionObserverEntry) => {
  if (!entry.isIntersecting) {
    return false;
  }

  // a card taller than the area counts once it covers half of it
  const areaHeight = entry.rootBounds?.height ?? 0;
  return (
    entry.intersectionRatio >= 0.5 ||
    (areaHeight > 0 && entry.intersectionRect.height >= areaHeight / 2)
  );
};

/**
 * Counts Scrolled notes (CONTEXT.md): a card counts once it's at least half
 * visible in the scroll container below the sticky header.
 * One IntersectionObserver for all cards; cards register via observeCard.
 * The observer is rebuilt when the header height changes (the note input grows),
 * the set of qualifying ids survives rebuilds, so only a not qualifying →
 * qualifying change counts.
 * Scrolled is the number of counted notes still among the loaded items, so a
 * deleted note drops out. The total is the latest page's total plus the notes
 * created since that page loaded (noteCreated).
 */
export const useFeedScrollCounter = ({
  scrollRef,
  headerRef,
  items,
  pageCount,
  total: pageTotal,
}: Params) => {
  const [state, setState] = useState<FeedScrollState>(() => ({
    counted: new Set(),
    round: 1,
  }));
  const [headerHeight, setHeaderHeight] = useState<number | null>(null);
  const [created, setCreated] = useState({ created: 0, pageCount });

  // a new page's total already includes the notes created before it
  const total =
    pageTotal + (created.pageCount === pageCount ? created.created : 0);

  // prune the notes that left the loaded items (deleted), during render
  const itemIds = useMemo(() => new Set(items.map((item) => item.id)), [items]);
  const [prunedFor, setPrunedFor] = useState(itemIds);
  if (prunedFor !== itemIds) {
    setPrunedFor(itemIds);
    if ([...state.counted].some((noteId) => !itemIds.has(noteId))) {
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

          if (!qualifies(entry)) {
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
        threshold: THRESHOLDS,
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

  // stable ref callback for the cards, reads data-note-id
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
