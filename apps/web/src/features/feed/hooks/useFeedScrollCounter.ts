import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from 'react';

import { toFeedRound } from '../utils/feed.utils';

interface Params {
  scrollRef: RefObject<HTMLElement | null>;
  served: number;
  rendered: number;
  pageCount: number;
  latestPageTotal: number;
}

/**
 * Estimates the Scrolled notes from the scroll position: the share of the
 * cards wrapper above the bottom of the scroll area, times the rendered cards,
 * plus the served notes no longer rendered (moved down by a later round).
 */
export const useFeedScrollCounter = ({
  scrollRef,
  served,
  rendered,
  pageCount,
  latestPageTotal,
}: Params) => {
  const [cards, setCards] = useState<HTMLElement | null>(null);
  const [seen, setSeen] = useState(0);
  const seenRef = useRef(seen);
  const [created, setCreated] = useState({ created: 0, pageCount });

  const createdSinceLatestPage =
    created.pageCount === pageCount ? created.created : 0;
  const total = latestPageTotal + createdSinceLatestPage;

  // the wrapper mounts after the first page loads, so the effect is keyed on it
  useEffect(() => {
    const root = scrollRef.current;
    if (!root || !cards) {
      return;
    }

    const measure = () => {
      const areaBottom = root.getBoundingClientRect().bottom;
      const rect = cards.getBoundingClientRect();
      const ratio =
        rect.height > 0
          ? Math.min(Math.max((areaBottom - rect.top) / rect.height, 0), 1)
          : 0;
      const next = Math.round(cards.children.length * ratio);

      if (next !== seenRef.current) {
        seenRef.current = next;
        setSeen(next);
      }
    };

    let frame = 0;
    const onScroll = () => {
      if (frame) {
        return;
      }
      frame = requestAnimationFrame(() => {
        frame = 0;
        measure();
      });
    };

    // fires on an appended page, a deleted card or a card changing height
    const observer = new ResizeObserver(measure);
    observer.observe(cards);
    root.addEventListener('scroll', onScroll, { passive: true });
    measure();

    return () => {
      root.removeEventListener('scroll', onScroll);
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [scrollRef, cards]);

  const { scrolled, round } = toFeedRound(served - rendered + seen, total);

  const noteCreated = useCallback(() => {
    setCreated((prev) => ({
      created: (prev.pageCount === pageCount ? prev.created : 0) + 1,
      pageCount,
    }));
  }, [pageCount]);

  return { scrolled, total, round, cardsRef: setCards, noteCreated };
};
