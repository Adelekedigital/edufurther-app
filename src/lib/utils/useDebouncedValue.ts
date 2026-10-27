'use client';

import { useEffect, useState } from 'react';

/** `value`, once it has held still for `ms`: a search that asks when typing pauses. */
export function useDebouncedValue<T>(value: T, ms: number): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setSettled(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return settled;
}
