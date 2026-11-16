import { useCallback, useEffect, useRef, useState } from 'react';

import type { NoteEntity, NoteTier } from '@later/types';

import { useSetNoteTierMutation } from '@/features/notes/api/notes.api';
import { useDisplayErrorToast } from '@/shared/hooks/useDisplayErrorToast';

import { FEED_TIER_DEBOUNCE_MS } from '../const/feed.constants';

/**
 * Optimistic note tier. Changes are batched: one request with the latest value
 * is sent after a pause, requests never overlap, a failure reverts to the last
 * confirmed value. A pending change is flushed on unmount.
 * cancel() drops the pending change and silences an in-flight one, e.g. before
 * the note is deleted; the next change resumes sending.
 */
export const useBatchedTier = (item: NoteEntity) => {
  const [tier, setTier] = useState(item.tier);

  // the latest local value, readable from timers and async code
  const tierRef = useRef(item.tier);
  const confirmedRef = useRef(item.tier);
  const debounceRef = useRef<number | undefined>(undefined);
  const isSendingRef = useRef(false);
  const isMountedRef = useRef(false);
  const isCancelledRef = useRef(false);

  const [setNoteTier] = useSetNoteTierMutation();
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
        tierRef.current !== confirmedRef.current
      ) {
        const value = tierRef.current;
        try {
          const response = await setNoteTier({
            noteId: item.id,
            body: { tier: value },
          }).unwrap();
          confirmedRef.current = response.data?.tier ?? value;
        } catch (e) {
          // the note is being deleted, its tier doesn't matter anymore;
          // TS keeps the loop narrowing, but cancel() may run during the await
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
          if (isCancelledRef.current) {
            return;
          }
          window.clearTimeout(debounceRef.current);
          debounceRef.current = undefined;
          tierRef.current = confirmedRef.current;
          if (isMountedRef.current) {
            setTier(confirmedRef.current);
          }
          displayErrorToast(e, 'Error of setting a note tier');
          return;
        }
      }
    } finally {
      isSendingRef.current = false;
    }
  }, [item.id, setNoteTier, displayErrorToast]);

  const change = useCallback(
    (next: NoteTier) => {
      if (next === tierRef.current) {
        return;
      }

      // a new change after a failed delete, the note still exists
      isCancelledRef.current = false;
      tierRef.current = next;
      setTier(next);

      window.clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(() => {
        debounceRef.current = undefined;
        void send();
      }, FEED_TIER_DEBOUNCE_MS);
    },
    [send],
  );

  const cancel = useCallback(() => {
    isCancelledRef.current = true;
    window.clearTimeout(debounceRef.current);
    debounceRef.current = undefined;
    tierRef.current = confirmedRef.current;
    setTier(confirmedRef.current);
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

  return { tier, change, cancel };
};
