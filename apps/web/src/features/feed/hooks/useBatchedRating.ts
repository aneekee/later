import { useCallback, useEffect, useRef, useState } from 'react';

import type { FeedItemEntity } from '@later/types';

import { useDisplayErrorToast } from '@/shared/hooks/useDisplayErrorToast';

import { useSetMessageRatingMutation } from '../api/feed.api';
import { FEED_RATING_DEBOUNCE_MS } from '../const/feed.constants';
import { clampRating } from '../utils/feed.utils';

/**
 * Optimistic note rating. Changes are batched: one request with the latest value
 * is sent after a pause, requests never overlap, a failure reverts to the last
 * confirmed value. A pending change is flushed on unmount.
 */
export const useBatchedRating = (item: FeedItemEntity) => {
  const [rating, setRating] = useState(item.rating);

  // the latest local value, readable from timers and async code
  const ratingRef = useRef(item.rating);
  const confirmedRef = useRef(item.rating);
  const debounceRef = useRef<number | undefined>(undefined);
  const isSendingRef = useRef(false);
  const isMountedRef = useRef(false);

  const [setMessageRating] = useSetMessageRatingMutation();
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
        debounceRef.current === undefined &&
        ratingRef.current !== confirmedRef.current
      ) {
        const value = ratingRef.current;
        try {
          const response = await setMessageRating({
            chatId: item.chatId,
            messageId: item.id,
            body: { rating: value },
          }).unwrap();
          confirmedRef.current = response.data?.rating ?? value;
        } catch (e) {
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
  }, [item.chatId, item.id, setMessageRating, displayErrorToast]);

  const change = useCallback(
    (delta: number) => {
      const next = clampRating(ratingRef.current + delta);
      if (next === ratingRef.current) {
        return;
      }

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

  return { rating, change };
};
