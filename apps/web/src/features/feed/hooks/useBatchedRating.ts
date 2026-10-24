import { useCallback, useEffect, useRef, useState } from 'react';

import type { FeedItemEntity } from '@later/types';

import { useDisplayErrorToast } from '@/shared/hooks/useDisplayErrorToast';

import { useSetFeedNoteRatingMutation } from '../api/feed.api';
import { FEED_RATING_DEBOUNCE_MS } from '../const/feed.constants';
import { clampRating } from '../utils/feed.utils';

/**
 * Optimistic note rating. Changes are batched: one request with the latest value
 * is sent after a pause, requests never overlap, a failure reverts to the last
 * confirmed value. A pending change is flushed on unmount.
 * cancel() drops the pending change and silences an in-flight one, e.g. before
 * the note is deleted; the next change resumes sending.
 */
export const useBatchedRating = (item: FeedItemEntity) => {
  const [rating, setRating] = useState(item.rating);

  // the latest local value, readable from timers and async code
  const ratingRef = useRef(item.rating);
  const confirmedRef = useRef(item.rating);
  const debounceRef = useRef<number | undefined>(undefined);
  const isSendingRef = useRef(false);
  const isMountedRef = useRef(false);
  const isCancelledRef = useRef(false);

  const [setFeedNoteRating] = useSetFeedNoteRatingMutation();
  const { displayErrorToast } = useDisplayErrorToast();

  const send = useCallback(async () => {
    // the running loop picks up the latest value
    if (isSendingRef.current) {
      return;
    }

    isSendingRef.current = true;
    try {
      // a pending debounce sends later, don't send intermediate values
      while (
        !isCancelledRef.current &&
        debounceRef.current === undefined &&
        ratingRef.current !== confirmedRef.current
      ) {
        const value = ratingRef.current;
        try {
          const response = await setFeedNoteRating({
            messageId: item.id,
            body: { rating: value },
          }).unwrap();
          confirmedRef.current = response.data?.rating ?? value;
        } catch (e) {
          // the note is being deleted, its rating doesn't matter anymore;
          // TS keeps the loop narrowing, but cancel() may run during the await
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          if (isCancelledRef.current) {
            return;
          }
          window.clearTimeout(debounceRef.current);
          debounceRef.current = undefined;
          ratingRef.current = confirmedRef.current;
          if (isMountedRef.current) {
            setRating(confirmedRef.current);
          }
          displayErrorToast(e, 'Error of rating a note');
          return;
        }
      }
    } finally {
      isSendingRef.current = false;
    }
  }, [item.id, setFeedNoteRating, displayErrorToast]);

  const change = useCallback(
    (delta: number) => {
      const next = clampRating(ratingRef.current + delta);
      if (next === ratingRef.current) {
        return;
      }

      // a new change after a failed delete, the note still exists
      isCancelledRef.current = false;
      ratingRef.current = next;
      setRating(next);

      window.clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(() => {
        debounceRef.current = undefined;
        void send();
      }, FEED_RATING_DEBOUNCE_MS);
    },
    [send],
  );

  const cancel = useCallback(() => {
    isCancelledRef.current = true;
    window.clearTimeout(debounceRef.current);
    debounceRef.current = undefined;
    ratingRef.current = confirmedRef.current;
    setRating(confirmedRef.current);
  }, []);

  const sendRef = useRef(send);
  useEffect(() => {
    sendRef.current = send;
  }, [send]);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;

      if (debounceRef.current !== undefined) {
        window.clearTimeout(debounceRef.current);
        debounceRef.current = undefined;
        void sendRef.current();
      }
    };
  }, []);

  return { rating, change, cancel };
};
