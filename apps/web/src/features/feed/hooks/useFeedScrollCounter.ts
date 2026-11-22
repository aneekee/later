import { useEffect, useRef, useState, type RefObject } from 'react';

interface Props {
  scrollRef: RefObject<HTMLElement | null>;
  // the visit total: the first page's total, lowered by deletes
  total: number;
}

/**
 * Estimates the Scrolled notes from the scroll position: the share of the
 * cards wrapper above the bottom of the scroll area, times the rendered cards.
 */
export const useFeedScrollCounter = ({ scrollRef, total }: Props) => {
  const [cards, setCards] = useState<HTMLElement | null>(null);
  const [seen, setSeen] = useState(0);
  const seenRef = useRef(seen);

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

    // fires on an appended page, a deleted card or a card changing height,
    // and on the scroll area changing height (e.g. resizing the window)
    const observer = new ResizeObserver(measure);
    observer.observe(cards);
    observer.observe(root);
    root.addEventListener('scroll', onScroll, { passive: true });
    measure();

    return () => {
      root.removeEventListener('scroll', onScroll);
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [scrollRef, cards]);

  return { scrolled: seen, total, cardsRef: setCards };
};
