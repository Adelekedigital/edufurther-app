'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
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
  | { kind: 'offline' }
  | { kind: 'failed' };

/** A fresh grant, rather than the one that was already there. */
export function isNew(
  before: CalendarConnection | null,
  now: CalendarConnection | null,
): boolean {
  if (!now) return false;
  if (!before) return true;
  // Reconnecting replaces the grant, so its timestamp moves; the status flip
  // covers a backend that reuses the row and only clears the fault.
  return (
    now.connectedAt !== before.connectedAt ||
    (before.status === 'error' && now.status === 'active')
  );
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
  announce: (message: string) => void,
) {
  const start = useStartCalendarConnect();
  const refresh = useRefreshAfterConnect(userId);
  const [state, setState] = useState<ConnectState>({ kind: 'idle' });
  const running = useRef(false);
  // Nothing on this deployment can ever answer a consent url, so once we know
  // that, dismissing the notice must not re-arm the button. State rather than a
  // ref because the button's disabled-ness is rendered from it.
  const [unavailable, setUnavailable] = useState(false);
  // Leaving the page must stop the poll, its listeners and its timer — and stop
  // it calling setState into a tree that is gone.
  const abort = useRef<AbortController | null>(null);
  useEffect(() => () => abort.current?.abort(), []);

  const connect = useCallback(async () => {
    if (running.current || unavailable) return;
    running.current = true;
    setState({ kind: 'busy' });
    const before = connection;
    const controller = new AbortController();
    abort.current = controller;
    const popup = openConsentWindow();
    try {
      const started = await start.start();
      if (!started.ok) {
        popup?.close();
        if (started.reason === 'unconfigured') setUnavailable(true);
        setState({
          kind:
            started.reason === 'unconfigured'
              ? 'unavailable'
              : started.reason === 'offline'
                ? 'offline'
                : 'failed',
        });
        return;
      }
      const outcome = await waitForConsent(popup, started.consentUrl, {
        signal: controller.signal,
        isDone: async () => {
          try {
            return isNew(before, await readCalendarConnection(controller.signal));
          } catch {
            // A blip mid-consent is not an answer; keep waiting for one.
            return false;
          }
        },
      });
      if (controller.signal.aborted || outcome === 'abandoned') return;
      if (outcome === 'connected') {
        // Hold busy until the row is actually true, or it reads "Connect" for
        // a moment after we have just said it is connected.
        await refresh();
        setState({ kind: 'idle' });
        announce(
          'Google Calendar connected. Your busy times are now hidden from your booking page.',
        );
        return;
      }
      // Denying consent writes nothing, so there is no failure to report — the
      // connection simply does not exist (backend reply #4). A refused url is
      // our own doing and belongs with the other "could not start" cases.
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
      if (!controller.signal.aborted) setState({ kind: 'failed' });
    } finally {
      running.current = false;
    }
  }, [announce, connection, refresh, start, unavailable]);

  return {
    state,
    connect,
    /**
     * Separate from `state`: dismissing the notice should put the explanation
     * away, not re-arm a control that cannot work on this deployment.
     */
    unavailable,
    dismiss: () => setState({ kind: 'idle' }),
  };
}
