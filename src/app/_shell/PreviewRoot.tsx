'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { PreviewBar } from '@/components/organisms/PreviewBar/PreviewBar';
import {
  PreviewUserPicker,
  type PickerRole,
} from '@/components/organisms/PreviewUserPicker/PreviewUserPicker';
import { NoticeDialog } from '@/components/templates/NoticeDialog/NoticeDialog';
import {
  previewHome,
  useAdminUsers,
  usePreview,
  usePreviewActions,
  useRestorePreview,
} from '@/lib/api/data/preview';
import { previewStore, type PreviewUser } from '@/lib/api/data/previewStore';
import { api } from '@/lib/api/data/http';
import { useSession } from '@/lib/api/data/session';
import { useViewer } from '@/lib/api/data/viewer';
import { appEnv } from '@/lib/config/preview';
import { PREVIEW_COPY } from '@/lib/copy/preview';
import { useDebouncedValue } from '@/lib/utils/useDebouncedValue';
import NotFound from '../not-found';
import { RoleLoading } from './RoleRedirect';
import { useViewAsParam } from './useViewAsParam';

/** PRD, The user picker: server search, 250 ms after typing stops. */
const SEARCH_DEBOUNCE_MS = 250;

/**
 * Preview as user, mounted once at the root (Providers) so the bar shows on
 * every app screen, the onboarding flows outside the app shell included. The
 * page-level half: it fetches (the user search, the session read-back) and
 * hands the bar and picker their props. Also the two notices: "Read only"
 * (a refused write) and "Preview ended" (idle or the 2-hour cap), ?viewAs=,
 * and the page-view log. Wraps the app so a ?viewAs= nobody may use shows not found.
 */
export function PreviewRoot({ children }: { children: ReactNode }) {
  const state = usePreview();
  useRestorePreview();
  const qc = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const session = useSession();
  const viewer = useViewer();
  // The search is keyed by who signed in (the admin, whoever is previewed);
  // with no sign-in session (local mock mode) by the viewer.
  const adminId =
    session.status === 'present' ? session.userId : viewer.kind === 'member' ? viewer.id : null;
  const actions = usePreviewActions();
  const env = appEnv();

  const shown = state.sessionId !== null || state.open;
  const pickerId = useId();
  const pickButton = useRef<HTMLButtonElement>(null);
  // Opens with the bar from the icon, and on a ?viewAs= miss (PRD, Ways in).
  const [picking, setPicking] = useState(false);
  const [wasOpen, setWasOpen] = useState(state.open);
  if (wasOpen !== state.open) {
    setWasOpen(state.open);
    if (state.open) setPicking(true);
  }
  const [query, setQuery] = useState('');
  const [role, setRole] = useState<PickerRole>('all');
  const q = useDebouncedValue(query.trim(), SEARCH_DEBOUNCE_MS);
  const users = useAdminUsers(adminId, q, role, shown && picking);
  const notFound = useViewAsParam(viewer, state.sessionId !== null, actions.preview);

  // The preview log's page views: each path once per arrival, no query string
  // (PRD, Backend). Sent without the preview header: the admin's own record.
  const logged = useRef<string | null>(null);
  useEffect(() => {
    const id = state.sessionId;
    // Not the page being left after a change of who is previewed (code review).
    if (!id || !state.user || !pathname || state.leaving === pathname) return;
    const key = `${id}:${state.user.id}:${pathname}`;
    if (logged.current === key) return;
    logged.current = key;
    void api
      .POST('/api/v1/admin/preview-sessions/{preview_id}/page-views', {
        params: { path: { preview_id: id } },
        body: { path: pathname },
      })
      .catch(() => {
        // A missed page view is a gap in the log, never an error for the admin.
      });
  }, [state.sessionId, state.user, state.leaving, pathname]);

  // Arrived: the address moved off the page being left. If the navigation
  // never happens (it failed, or went nowhere), the page comes back after 3 s.
  const leaving = state.leaving;
  useEffect(() => {
    if (leaving === null) return;
    if (pathname !== leaving) return previewStore.arrived();
    const t = setTimeout(() => previewStore.arrived(), 3000);
    return () => clearTimeout(t);
  }, [leaving, pathname]);

  // The bar's height moves every sticky top edge down (--ef-va-h, globals.css).
  useEffect(() => {
    const root = document.documentElement;
    if (shown) root.dataset.previewing = '';
    else delete root.dataset.previewing;
    return () => {
      delete root.dataset.previewing;
    };
  }, [shown]);

  // Server-rendered routes run as the admin's own sign-in and can't see this
  // tab's preview (PRD, Read only): `/` (the home redirect) routes on the
  // client to the previewed user's Home instead, and Join and Rejoin (the
  // entry route, /sessions/{id}/enter, ADR 0009) are a write, so "Read only".
  const previewRole = state.user?.role ?? null;
  useEffect(() => {
    if (!previewRole) return;
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.('a[href]');
      if (!(a instanceof HTMLAnchorElement) || e.defaultPrevented) return;
      const to = serverRoute(a.href);
      if (!to) return;
      e.preventDefault();
      e.stopPropagation();
      if (to === 'enter') previewStore.blocked(true);
      else router.push(previewHome(previewRole));
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [previewRole, router]);

  // A preview the server ended: drop everything cached for that user and go
  // back to where it started; "Preview ended" says why when it was idle or the cap.
  const ended = state.ended;
  const dropped = state.dropped;
  useEffect(() => {
    const done = ended ?? dropped;
    if (!done) return;
    previewStore.leave(window.location.pathname, done.returnTo ?? '/');
    qc.clear();
    router.replace(done.returnTo ?? '/');
    previewStore.settled();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per end
  }, [ended?.reason, ended?.name, dropped]);

  const closePicker = () => {
    setPicking(false);
    setQuery('');
    actions.clearError();
    pickButton.current?.focus();
  };

  const pick = async (user: PreviewUser) => {
    if (user.id === state.user?.id) return closePicker();
    const ok = await actions.preview({ userId: user.id }, pathname);
    if (ok) {
      setPicking(false);
      setQuery('');
    }
  };

  return (
    <>
      {shown && (
        <PreviewBar
          ref={pickButton}
          user={state.user}
          env={env}
          pickerOpen={picking}
          pickerId={pickerId}
          onTogglePicker={() => (picking ? closePicker() : setPicking(true))}
          onExit={() => {
            setPicking(false);
            void actions.exit();
          }}
          picker={
            <PreviewUserPicker
              id={pickerId}
              query={query}
              onQuery={setQuery}
              role={role}
              onRole={setRole}
              users={users.users}
              status={users.isError ? 'error' : users.isLoading ? 'loading' : 'ready'}
              onRetry={users.retry}
              currentId={state.user?.id ?? null}
              miss={state.miss}
              startFailed={actions.error === 'failed'}
              onPick={(u) => void pick(u)}
              more={users}
              onClose={closePicker}
            />
          }
        />
      )}
      {state.blocked && state.user && (
        <NoticeDialog
          title={PREVIEW_COPY.readOnly.title}
          icon="visibility"
          okLabel={PREVIEW_COPY.readOnly.ok}
          onClose={() => previewStore.blocked(false)}
        >
          {PREVIEW_COPY.readOnly.body(PREVIEW_COPY.envName(env)).before}
          <strong>{state.user.name}</strong>
          {PREVIEW_COPY.readOnly.body(PREVIEW_COPY.envName(env)).after}
        </NoticeDialog>
      )}
      {ended && (
        <NoticeDialog
          title={PREVIEW_COPY.ended.title}
          icon="timer_off"
          okLabel={PREVIEW_COPY.ended.ok}
          onClose={() => previewStore.dismissEnded()}
        >
          {PREVIEW_COPY.ended.body(ended.name, ended.reason)}
        </NoticeDialog>
      )}
      {notFound ? (
        <NotFound />
      ) : leaving !== null && leaving === pathname ? (
        // Between identities: the old page isn't drawn (nor refetched as the new one).
        <RoleLoading />
      ) : (
        children
      )}
    </>
  );
}

/** A link on this site to a route the server answers as the admin: `/`, or Session Join's entry. */
export function serverRoute(href: string): 'home' | 'enter' | null {
  try {
    const url = new URL(href, window.location.origin);
    if (url.origin !== window.location.origin) return null;
    if (url.pathname === '/') return 'home';
    return /^\/sessions\/[^/]+\/enter\/?$/.test(url.pathname) ? 'enter' : null;
  } catch {
    return null;
  }
}
