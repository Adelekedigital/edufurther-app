'use client';

import { useCallback, useRef, useState } from 'react';
import {
  readCalendarConnection,
  useRefreshAfterConnect,
  useStartCalendarConnect,
  type CalendarConnection,
} from '@/lib/api/data/calendarConnection';
import { openConsentWindow, waitForConsent } from '@/lib/utils/connectPopup';

/**
 * What the Connect control is doing. Every branch ends somewhere a mentor can
 * act on — there is no state that just spins.
 */
export type ConnectState =
  | { kind: 'idle' }
  | { kind: 'busy' }
  /** This deployment has no Google client (backend reply #1). Not retryable. */
  | { kind: 'unavailable' }
  | { kind: 'blocked' }
  | { kind: 'nothingConnected' }
  | { kind: 'failed' };

/** A fresh grant, rather than the one that was already there. */
function isNew(before: CalendarConnection | null, now: CalendarConnection | null): boolean {
  if (!now) return false;
  if (!before) return true;
  // Reconnecting replaces the grant, so its timestamp moves; the status flip
  // covers a backend that reuses the row and only clears the fault.
  return now.connectedAt !== before.connectedAt || (before.status === 'error' && now.status === 'active');
}

/**
 * Drives the consent popup (`connectPopup`) and reports where it ended.
 *
 * The popup is opened on the click, before asking for the URL — a window
 * opened after an await has lost the user gesture and is blocked.
 */
export function useCalendarConnect(
  userId: string | null,
  connection: CalendarConnection | null,
  onConnected: (message: string) => void,
) {
  const start = useStartCalendarConnect();
  const refresh = useRefreshAfterConnect(userId);
  const [state, setState] = useState<ConnectState>({ kind: 'idle' });
  const running = useRef(false);

  const connect = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    setState({ kind: 'busy' });
    const before = connection;
    const popup = openConsentWindow();
    try {
      const started = await start.start();
      if (!started.ok) {
        popup?.close();
        setState({ kind: started.reason === 'unconfigured' ? 'unavailable' : 'failed' });
        return;
      }
      const outcome = await waitForConsent(popup, started.consentUrl, {
        isDone: async () => {
          try {
            return isNew(before, await readCalendarConnection());
          } catch {
            // A blip mid-consent is not an answer; keep waiting for one.
            return false;
          }
        },
      });
      if (outcome === 'connected') {
        setState({ kind: 'idle' });
        refresh();
        onConnected('Google Calendar connected. Your busy times are now hidden from your booking page.');
        return;
      }
      // Denying consent writes nothing, so there is no failure to report —
      // the connection simply does not exist (backend reply #4). A refused url
      // is our own doing and belongs with the other "could not start" cases.
      setState({
        kind:
          outcome === 'blocked'
            ? 'blocked'
            : outcome === 'refused'
              ? 'failed'
              : 'nothingConnected',
      });
    } catch {
      popup?.close();
      setState({ kind: 'failed' });
    } finally {
      running.current = false;
    }
  }, [connection, onConnected, refresh, start]);

  return { state, connect, dismiss: () => setState({ kind: 'idle' }) };
}
