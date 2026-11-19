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
import {
  countScrolledCard,
  findCardsInView,
  isHalfVisible,
} from '../utils/feed.utils';

interface Params {
  scrollRef: RefObject<HTMLElement | null>;
  headerRef: RefObject<HTMLElement | null>;
  listRef: RefObject<HTMLElement | null>;
  items: NoteEntity[];
  pageCount: number;
  latestPageTotal: number;
}

export const useFeedScrollCounter = ({
  scrollRef,
  headerRef,
  listRef,
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
  const cardTopsRef = useRef(new Map<string, number>());
  const qualifyingRef = useRef(new Set<string>());

  useEffect(() => {
    totalRef.current = total;
  }, [total]);

  useEffect(() => {
    const root = scrollRef.current;
    const list = listRef.current;
    if (!root || !list) {
      return;
    }

    const cardTops = cardTopsRef.current;

    const checkCardsInView = () => {
      const rootRect = root.getBoundingClientRect();
      const areaTop =
        headerRef.current?.getBoundingClientRect().bottom ?? rootRect.top;
      const cardsInView = findCardsInView(list, rootRect.top, rootRect.bottom);
      const idsInView = new Set(cardsInView.map(({ noteId }) => noteId));
      const newlyQualifying: string[] = [];

      cardTops.forEach((_, noteId) => {
        if (!idsInView.has(noteId)) {
          cardTops.delete(noteId);
          qualifyingRef.current.delete(noteId);
        }
      });

      cardsInView.forEach(({ noteId, rect }) => {
        const top = rect.top - rootRect.top;
        if (cardTops.get(noteId) === top) {
          return;
        }

        cardTops.set(noteId, top);
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

    let frame = 0;
    const scheduleCheck = () => {
      if (!frame) {
        frame = requestAnimationFrame(() => {
          frame = 0;
          checkCardsInView();
        });
      }
    };

    const resizeObserver = new ResizeObserver(checkCardsInView);
    resizeObserver.observe(root);
    resizeObserver.observe(list);
    if (headerRef.current) {
      resizeObserver.observe(headerRef.current);
    }
    root.addEventListener('scroll', scheduleCheck, { passive: true });

    return () => {
      root.removeEventListener('scroll', scheduleCheck);
      resizeObserver.disconnect();
      cancelAnimationFrame(frame);
      cardTops.clear();
    };
  }, [scrollRef, headerRef, listRef]);

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
    noteCreated,
  };
};
