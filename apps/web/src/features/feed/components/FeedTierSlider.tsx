import { useState } from 'react';
import type { CSSProperties } from 'react';

import type { NoteTier } from '@later/types';

import { Slider } from '@/shared/components/ui/slider';
import { cn } from '@/shared/lib/utils';

import { FEED_TIERS, FEED_TIER_STYLES } from '../const/feed.constants';

interface Props {
  tier: NoteTier;
  onChange: (tier: NoteTier) => void;
}

// slider positions are indexes into FEED_TIERS
const LAST_POSITION = FEED_TIERS.length - 1;

// Radix keeps the 24 px thumb in bounds, so stop i is centered here;
// the dot and label overlays use the same formula
const stopLeft = (position: number) =>
  `calc(12px + ${String(position / LAST_POSITION)} * (100% - 24px))`;

/**
 * A stepped tier slider, D on the left to S on the right, controlled by `tier`.
 * While dragging, the thumb follows a local value; the tier is reported only
 * on release (or on each key press), the caller batches the saves.
 */
export const FeedTierSlider = ({ tier, onChange }: Props) => {
  // the drag in progress, valid only while `tier` is still the one it started from,
  // so a revert or a cache update from outside wins
  const [drag, setDrag] = useState<{ from: NoteTier; position: number }>();

  // a tier this app doesn't know (e.g. from an API without tiers) shows as the lowest
  // instead of breaking the card
  const position =
    drag?.from === tier ? drag.position : Math.max(FEED_TIERS.indexOf(tier), 0);
  const shownTier = FEED_TIERS[position];
  const style = FEED_TIER_STYLES[shownTier];

  return (
    <div
      className={cn(
        'relative min-w-0 max-w-[300px] flex-1',
        '[--tier:var(--tier-light)] dark:[--tier:var(--tier-dark)]',
      )}
      style={
        {
          '--tier-light': style.light,
          '--tier-dark': style.dark,
          '--tier-f': position / LAST_POSITION,
        } as CSSProperties
      }
    >
      <Slider
        min={0}
        max={LAST_POSITION}
        step={1}
        value={[position]}
        // one thumb, so one value
        onValueChange={([value]) => setDrag({ from: tier, position: value })}
        // Radix commits on release and on each key press, only when the value changed
        onValueCommit={([value]) => {
          setDrag(undefined);
          onChange(FEED_TIERS[value]);
        }}
        // tall enough to cover the labels, so a tap on a label picks its tier
        className={cn(
          'h-[54px] cursor-pointer items-start pt-2',
          '[&_[data-slot=slider-track]]:h-6 [&_[data-slot=slider-track]]:bg-[#e7e7ea] dark:[&_[data-slot=slider-track]]:bg-[#2e2e30]',
          // the fill ends under the thumb's right edge, its rounded end hides behind the thumb
          '[&_[data-slot=slider-range]]:w-[calc(24px+var(--tier-f)*(100%-24px))] [&_[data-slot=slider-range]]:rounded-full [&_[data-slot=slider-range]]:bg-(--tier)',
          style.glow &&
            '[&_[data-slot=slider-track]]:shadow-[0_0_0_1px_color-mix(in_srgb,var(--tier)_35%,transparent),0_2px_12px_color-mix(in_srgb,var(--tier)_40%,transparent)]',
        )}
        thumbProps={{
          'aria-label': 'Tier',
          'aria-valuetext': shownTier,
          className:
            'size-6 cursor-grab border-[3px] border-(--tier) bg-white shadow-[0_1px_3px_rgb(0_0_0/0.25)] focus-visible:ring-4 active:cursor-grabbing',
        }}
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-2 h-6"
      >
        {FEED_TIERS.map((t, i) =>
          i === position ? null : (
            <span
              key={t}
              className={cn(
                'absolute top-1/2 size-1.5 -translate-1/2 rounded-full',
                i < position ? 'bg-white/60' : 'bg-black/18 dark:bg-white/22',
              )}
              style={{ left: stopLeft(i) }}
            />
          ),
        )}
      </div>

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-1 h-3.5"
      >
        {FEED_TIERS.map((t, i) => (
          <span
            key={t}
            className={cn(
              'absolute top-0 -translate-x-1/2 text-xs leading-3.5 tracking-[0.02em]',
              i === position
                ? 'font-bold text-foreground'
                : 'font-medium text-muted-foreground',
            )}
            style={{ left: stopLeft(i) }}
          >
            {t}
          </span>
        ))}
      </div>
    </div>
  );
};
