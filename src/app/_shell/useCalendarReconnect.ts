'use client';

import { useEffect, useRef } from 'react';
import { useCalendarConnection } from '@/lib/api/data/calendarConnection';
import { RECONNECT_COPY, RECONNECT_FAILURES, type ReconnectFailure } from '@/lib/copy/integrations';
import { focusPageHeading } from './RouteFocusManager';
import { useCalendarConnect, type ConnectState } from './useCalendarConnect';

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

  // `announce` is still the screen's live region, for SUCCESS only: the banner
  // unmounts the moment it reconnects, so its own alert region cannot say so.
  const { state, connect, unavailable } = useCalendarConnect(
    userId,
    connection,
    announce,
    RECONNECT_COPY.reconnected,
  );

  const kind = state.kind;
  // Typed so a kind added to ConnectState without a line here is a compile
  // error. Falling back to null would stop the spinner, say nothing, and leave
  // a button that looks like it did nothing, which is the one thing
  // ConnectState promises never to do.
  const failures: Record<
    Exclude<ConnectState['kind'], 'idle' | 'busy'>,
    string
  > = RECONNECT_FAILURES;
  const failure = kind === 'busy' || kind === 'idle' ? null : failures[kind];

  /**
   * The banner unmounts the moment the grant is repaired, taking the focused
   * Reconnect button with it, and focus falls to <body>. Only after an attempt
   * of their own: a connection repaired in another tab must not move focus
   * out from under someone reading this page (review of #357).
   */
  const attempted = useRef(false);
  const wasShowing = useRef(broken);
  useEffect(() => {
    if (wasShowing.current && !broken && attempted.current) {
      attempted.current = false;
      focusPageHeading();
    }
    wasShowing.current = broken;
  }, [broken]);

  return {
    show: broken,
    busy: kind === 'busy',
    unavailable,
    failure,
    reconnect: () => {
      attempted.current = true;
      void connect();
    },
  };
}
