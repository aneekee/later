import { useCallback, useEffect, useRef } from 'react';
import type { MouseEvent, PointerEvent } from 'react';

import {
  FEED_RATING_HOLD_DELAY_MS,
  FEED_RATING_HOLD_FAST_AFTER_MS,
  FEED_RATING_HOLD_FAST_INTERVAL_MS,
  FEED_RATING_HOLD_SLOW_INTERVAL_MS,
} from '../const/feed.constants';

/**
 * Press-and-hold for a button: steps once on press,
 * then repeats with acceleration until released.
 * Keyboard activation steps once per click (Enter key repeat works as a hold).
 * Spread the returned handlers onto the button.
 */
export const useHoldRepeat = (onStep: () => void, disabled: boolean) => {
  const onStepRef = useRef(onStep);
  const timerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    onStepRef.current = onStep;
  }, [onStep]);

  const stop = useCallback(() => {
    window.clearTimeout(timerRef.current);
    timerRef.current = undefined;
  }, []);

  const start = useCallback(() => {
    stop();
    const startedAt = performance.now();

    const tick = () => {
      onStepRef.current();
      const elapsed = performance.now() - startedAt;
      timerRef.current = window.setTimeout(
        tick,
        elapsed < FEED_RATING_HOLD_FAST_AFTER_MS
          ? FEED_RATING_HOLD_SLOW_INTERVAL_MS
          : FEED_RATING_HOLD_FAST_INTERVAL_MS,
      );
    };

    onStepRef.current();
    timerRef.current = window.setTimeout(tick, FEED_RATING_HOLD_DELAY_MS);
  }, [stop]);

  // a disabled button gets no pointerup, stop the hold when a bound is reached
  useEffect(() => {
    if (disabled) {
      stop();
    }
  }, [disabled, stop]);

  useEffect(() => stop, [stop]);

  return {
    onPointerDown: (event: PointerEvent<HTMLButtonElement>) => {
      if (event.button === 0) {
        start();
      }
    },
    onPointerUp: stop,
    onPointerLeave: stop,
    onPointerCancel: stop,
    onBlur: stop,
    // no long-press menu on touch
    onContextMenu: (event: MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
    },
    // pointer presses are handled above, `detail` is 0 for keyboard clicks only
    onClick: (event: MouseEvent<HTMLButtonElement>) => {
      if (event.detail === 0) {
        onStepRef.current();
      }
    },
  };
};
