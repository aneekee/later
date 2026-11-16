import type { NoteEntity, NoteTier } from '@later/types';

/**
 * Tier saves confirmed by BE, ordered by a counter. A feed page requested before
 * a save may still carry the older tier; it's reconciled with the saves confirmed
 * after the page was requested, so a stale page never overwrites a confirmed tier.
 */
let confirmationSeq = 0;
const confirmedTiers = new Map<string, { tier: NoteTier; seq: number }>();

export const recordConfirmedTier = (noteId: string, tier: NoteTier) => {
  confirmationSeq += 1;
  confirmedTiers.set(noteId, { tier, seq: confirmationSeq });
};

/** Taken before a feed page request, passed to applyConfirmedTiersSince */
export const getTierConfirmationSeq = () => confirmationSeq;

export const applyConfirmedTiersSince = (
  items: NoteEntity[],
  sinceSeq: number,
): NoteEntity[] =>
  items.map((item) => {
    const confirmed = confirmedTiers.get(item.id);
    return confirmed && confirmed.seq > sinceSeq
      ? { ...item, tier: confirmed.tier }
      : item;
  });
