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
  const cardsInViewRef = useRef(new Map<HTMLElement, number | null>());
  const qualifyingRef = useRef(new Set<string>());

  useEffect(() => {
    totalRef.current = total;
  }, [total]);

  useEffect(() => {
    const root = scrollRef.current;
    if (!root) {
      return;
    }

    const checkCardsInView = () => {
      const rootRect = root.getBoundingClientRect();
      const areaTop =
        headerRef.current?.getBoundingClientRect().bottom ?? rootRect.top;
      const newlyQualifying: string[] = [];

      cardsInViewRef.current.forEach((lastTop, card) => {
        const noteId = card.dataset.noteId;
        const rect = card.getBoundingClientRect();
        const top = rect.top - rootRect.top;
        if (!noteId || top === lastTop) {
          return;
        }

        cardsInViewRef.current.set(card, top);
        if (!isHalfVisible(rect, areaTop, rootRect.bottom)) {
          qualifyingRef.current.delete(noteId);
        } else if (!qualifyingRef.current.has(noteId)) {
          qualifyingRef.current.add(noteId);
          newlyQualifying.push(noteId);
        }
      });

      if (newlyQualifying.length) {
        setState((prev) =>
          newlyQualifying.reduce(
            (next, noteId) => countScrolledCard(next, noteId, totalRef.current),
            prev,
          ),
        );
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const card = entry.target as HTMLElement;
          const isMounted = cardsRef.current.has(card);

          if (entry.isIntersecting && isMounted) {
            if (!cardsInViewRef.current.has(card)) {
              cardsInViewRef.current.set(card, null);
            }
            return;
          }

          cardsInViewRef.current.delete(card);
          if (card.dataset.noteId) {
            qualifyingRef.current.delete(card.dataset.noteId);
          }
        });

        checkCardsInView();
      },
      { root, threshold: FEED_SCROLL_OBSERVER_THRESHOLDS },
    );

    observerRef.current = observer;
    cardsRef.current.forEach((card) => {
      observer.observe(card);
    });
    root.addEventListener('scroll', checkCardsInView, { passive: true });

    const cardsInView = cardsInViewRef.current;
    return () => {
      root.removeEventListener('scroll', checkCardsInView);
      observer.disconnect();
      observerRef.current = null;
      cardsInView.clear();
    };
  }, [scrollRef, headerRef]);

  const observeCard = useCallback((card: HTMLElement | null) => {
    if (!card) {
      return;
    }

    cardsRef.current.add(card);
    observerRef.current?.observe(card);

    return () => {
      cardsRef.current.delete(card);
      cardsInViewRef.current.delete(card);
      observerRef.current?.unobserve(card);
    };
  }, []);

  const noteCreated = useCallback(() => {
    setCreated((prev) => ({
      created: (prev.pageCount === pageCount ? prev.created : 0) + 1,
      pageCount,
    }));
  }, [pageCount]);

  return {
    scrolled: Math.min(state.counted.size, total),
    total,
    round: state.round,
    observeCard,
    noteCreated,
  };
};
