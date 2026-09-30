import { useEffect, useRef } from 'react';

/**
 * A ref that always holds the latest value. For callbacks a mutation calls
 * later: a mutation keeps the options of the render that started it, so a
 * callback read through this is never a stale copy (review of #80).
 */
export function useLatest<T>(value: T) {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  });
  return ref;
}
