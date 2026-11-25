'use client';

import { useEffect, useMemo, useState } from 'react';

/**
 * The time, moved on once a minute: enough for every deadline a list shows
 * ("Starts in 8 min", a session leaving at its end, a door closing), and the
 * one clock those screens share, so they turn over together.
 */
export function useMinuteClock(): Date {
  const [clock, setClock] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setClock(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);
  return useMemo(() => new Date(clock), [clock]);
}
