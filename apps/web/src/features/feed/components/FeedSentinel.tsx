import { useEffect, useRef, type RefObject } from 'react';

interface Props {
  rootRef: RefObject<HTMLElement | null>;
  onVisible: () => void;
}

/**
 * Calls onVisible every time the sentinel enters the scroll container viewport.
 * The observer is created once, so it doesn't re-fire while the sentinel stays visible.
 */
export const FeedSentinel = ({ rootRef, onVisible }: Props) => {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const onVisibleRef = useRef(onVisible);

  useEffect(() => {
    onVisibleRef.current = onVisible;
  }, [onVisible]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          onVisibleRef.current();
        }
      },
      { root: rootRef.current },
    );

    observer.observe(sentinel);
    return () => {
      observer.disconnect();
    };
  }, [rootRef]);

  return <div ref={sentinelRef} className="h-px" aria-hidden="true" />;
};
