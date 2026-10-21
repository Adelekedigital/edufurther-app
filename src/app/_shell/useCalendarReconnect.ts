'use client';

import { useEffect, useRef } from 'react';
import { useCalendarConnection } from '@/lib/api/data/calendarConnection';
import {
  RECONNECT_COPY,
  RECONNECT_FAILURES,
  type ReconnectFailure,
} from '@/lib/copy/integrations';
import { useCalendarConnect } from './useCalendarConnect';

export type CalendarReconnect = {
  /** Only a connection the backend has marked broken puts this on screen. */
  show: boolean;
  /** The consent window is open. */
  busy: boolean;
  /** No Google client on this deployment, so the button cannot work. */
  unavailable: boolean;
  /** Why the last attempt did not land. Null until one fails. */
  failure: string | null;
  reconnect: () => void;
};

/**
 * Everything the reconnect banner needs, in one place because two screens show
 * it (PRD decision 5: Calendar and Mentor Home). The banner itself takes props
 * only, so this is the single copy of the logic rather than the same ten lines
 * written into both screens.
 *
 * It reuses `useCalendarConnect` unchanged — the same hook /integrations uses —
 * so the popup, the poll, the scheme allow-list and every outcome behave
 * identically wherever a mentor reconnects.
 */
export function useCalendarReconnect(
  userId: string | null,
  announce: (message: string) => void,
): CalendarReconnect {
  const calendar = useCalendarConnection(userId);
  const connection = calendar.data;
  // `status: 'error'` is the only state that means reconnect. Never connected,
  // deliberately disconnected, and a failed load all leave the page alone: a
  // banner that cried wolf on a network blip would be ignored when it mattered.
  const broken = !!connection && connection.status === 'error';

  const { state, connect, unavailable } = useCalendarConnect(
    userId,
    connection,
    announce,
    RECONNECT_COPY.reconnected,
  );

  const kind = state.kind;
  const failure: string | null =
    kind === 'busy' || kind === 'idle' ? null : (RECONNECT_FAILURES[kind as ReconnectFailure] ?? null);

  // A failure that is only drawn is neither seen nor heard by a screen reader
  // whose focus is on the Reconnect button, which merely stops being busy.
  const lastSaid = useRef<string | null>(null);
  useEffect(() => {
    if (failure && failure !== lastSaid.current) announce(failure);
    lastSaid.current = failure;
  }, [failure, announce]);

  return {
    show: broken,
    busy: kind === 'busy',
    unavailable,
    failure,
    reconnect: () => void connect(),
  };
}
