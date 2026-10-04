'use client';

import { useEffect, useState } from 'react';
import { Icon } from '@/components/atoms/Icon/Icon';
import { cx } from '@/lib/utils/cx';
import styles from './SuggestionCountdown.module.css';

/** Under this much left, the pill turns warm and says so in words too. */
const URGENT_MS = 10 * 60_000;
const HOUR_MS = 60 * 60_000;

type SuggestionCountdownProps = {
  /** UTC instant the hold ends (`BookingSuggestion.heldUntil`). */
  heldUntil: string;
  /** Injected in tests and stories; the live clock otherwise. */
  now?: Date;
  className?: string;
};

/**
 * How long an offered time stays held for the mentee, counting down live.
 *
 * `held_until` against the clock is the only thing this reads, on purpose. The
 * backend computes `suggestion.status` on every read, so a row fetched while
 * the hold was alive keeps saying `active` after it runs out — expected, not a
 * bug. The clock decides what to show; a re-read decides what it is. Anyone
 * tempted to trust the status here instead will reintroduce a stuck timer.
 */
export function SuggestionCountdown({ heldUntil, now, className }: SuggestionCountdownProps) {
  // A clock handed in is fixed; `getTime()` rather than the Date itself so a
  // new object each render does not restart the effect.
  const fixed = now ? now.getTime() : null;
  const [tick, setTick] = useState(() => Date.now());
  const until = Date.parse(heldUntil);
  // An unparseable instant reads as lapsed: no action is offered on it, and
  // nothing schedules a NaN timeout.
  const left = Number.isNaN(until) ? 0 : Math.max(0, until - (fixed ?? tick));

  useEffect(() => {
    // No timer at all for a fixed clock or a hold that is already over, so
    // there is nothing to leak and nothing keeping a dead number alive.
    if (fixed !== null || left <= 0) return;
    // Wake when the reading actually changes — just past the next whole minute
    // of *remaining* time, not every 60s from mount. A fixed interval would
    // leave "1m left" on screen for up to a minute after the hold ran out, and
    // waking exactly *on* the boundary would redraw the minute that is only
    // then expiring, so the +1ms buys one render per reading instead of two.
    const t = setTimeout(() => setTick(Date.now()), (left % 60_000) + 1);
    return () => clearTimeout(t);
  }, [fixed, left]);

  const lapsed = left <= 0;
  const urgent = !lapsed && left < URGENT_MS;

  return (
    <span className={cx(styles.pill, urgent && styles.urgent, lapsed && styles.lapsed, className)}>
      <Icon name={lapsed ? 'event_busy' : 'lock_clock'} size={14} />
      <span aria-hidden="true">{lapsed ? 'Hold lapsed' : `${holdLeftLabel(left)} left`}</span>
      {/*
        What a screen-reader user needs is not the minute — it is whether they
        still have room to decide. A polite region carrying "4m left" would
        interrupt every single minute, which is unusable, so the ticking text is
        visual and this says the band instead: it changes at most three times in
        a two-hour hold, and every change is a real change of situation. The
        region is in the page from the start, because one inserted with its text
        already in it is usually skipped (failure log #32).
      */}
      <span role="status" className="sr-only">
        {spokenBand(left)}
      </span>
    </span>
  );
}

/**
 * "1h 58m" · "58m" · "Less than a minute".
 *
 * Floored, never rounded up: a hold must not claim time it does not have. The
 * bands follow the two-hour hold — hours *and* minutes above an hour, because
 * "1h left" would be true for a whole hour of it; minutes alone below one,
 * where a leading "0h" is noise; and words under a minute, since "0m left"
 * reads as broken rather than urgent (the same call `formatRespondIn` makes).
 */
export function holdLeftLabel(ms: number): string {
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return 'Less than a minute';
  if (ms < HOUR_MS) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

/** The coarse reading, for the live region. */
const MINUTE_MS = 60_000;

function spokenBand(ms: number): string {
  if (ms <= 0) return 'The hold on this time has lapsed.';
  // The last minute gets its own band. Without it the region still read "less
  // than 10 minutes" at the moment it was about to run out — least urgent
  // exactly when it mattered most.
  if (ms < MINUTE_MS) return 'Less than a minute left to book this time.';
  if (ms < URGENT_MS) return 'Less than 10 minutes left to book this time.';
  if (ms < HOUR_MS) return 'Less than an hour left to book this time.';
  return 'More than an hour left to book this time.';
}

/** Whether a hold is over, by the clock. Shared so the notice and the pill agree. */
export function isHoldLapsed(heldUntil: string, now = new Date()): boolean {
  const until = Date.parse(heldUntil);
  return Number.isNaN(until) || until <= now.getTime();
}
