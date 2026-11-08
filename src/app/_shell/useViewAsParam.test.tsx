import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { usePreviewActions } from '@/lib/api/data/preview';
import { previewStore, resetPreviewStoreForTests } from '@/lib/api/data/previewStore';
import type { Viewer } from '@/types/mentor';
import { useViewAsParam } from './useViewAsParam';

const h = vi.hoisted(() => ({
  POST: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
  pathname: '/home',
}));
vi.mock('@/lib/api/data/http', () => ({ api: { POST: (...a: unknown[]) => h.POST(...a) } }));
vi.mock('next/navigation', () => ({
  usePathname: () => h.pathname,
  useRouter: () => ({ push: h.push, replace: h.replace }),
}));

const member = (over: object = {}): Viewer =>
  ({ kind: 'member', id: 'me-1', isAdmin: false, ...over }) as unknown as Viewer;
const admin = member({ id: 'admin-1', isAdmin: true, canPreviewAsUser: true });

function wrapper({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>;
}

const visit = (url: string) => {
  window.history.replaceState(null, '', url);
  h.pathname = new URL(url, 'http://x').pathname;
};
const here = () => window.location.pathname + window.location.search;

beforeEach(() => {
  h.POST.mockReset();
  h.push.mockReset();
  h.replace.mockReset();
  sessionStorage.clear();
  resetPreviewStoreForTests();
});
afterEach(() => window.history.replaceState(null, '', '/'));

describe('useViewAsParam (?viewAs=, PRD Ways in)', () => {
  it('no parameter: nothing happens', () => {
    visit('/home');
    const preview = vi.fn();
    const { result } = renderHook(() => useViewAsParam(admin, false, preview), { wrapper });
    expect(preview).not.toHaveBeenCalled();
    expect(result.current).toBe(false);
  });

  it('while /me loads: waits, and keeps the parameter', () => {
    visit('/home?viewAs=amara%40example.com');
    const preview = vi.fn();
    renderHook(() => useViewAsParam({ kind: 'loading', signedIn: true }, false, preview), {
      wrapper,
    });
    expect(preview).not.toHaveBeenCalled();
    expect(here()).toBe('/home?viewAs=amara%40example.com');
  });

  it('a guest: Sign in, then back to the same URL', () => {
    visit('/home?viewAs=amara%40example.com');
    renderHook(() => useViewAsParam({ kind: 'guest' }, false, vi.fn()), { wrapper });
    expect(h.replace).toHaveBeenCalledWith(
      `/login?next=${encodeURIComponent('/home?viewAs=amara%40example.com')}`,
    );
  });

  it('a non-admin: not found on this page, and the parameter is removed', () => {
    visit('/home?tab=x&viewAs=amara%40example.com');
    const preview = vi.fn();
    const { result } = renderHook(() => useViewAsParam(member(), false, preview), { wrapper });
    expect(preview).not.toHaveBeenCalled();
    expect(here()).toBe('/home?tab=x');
    expect(result.current).toBe(true);
    expect(previewStore.get().denied).toBe('/home');
  });

  it('not found holds for that page only: moving on clears it', () => {
    visit('/home?viewAs=a%40example.com');
    const { result, rerender } = renderHook(() => useViewAsParam(member(), false, vi.fn()), {
      wrapper,
    });
    expect(result.current).toBe(true);
    h.pathname = '/explore';
    rerender();
    expect(result.current).toBe(false);
    // Coming back to /home later, with no parameter, shows the page (GitHub review).
    h.pathname = '/home';
    rerender();
    expect(result.current).toBe(false);
  });

  it('an admin who may preview: starts it from this page, the parameter gone', () => {
    visit('/admin/mentors?viewAs=%20amara%40example.com%20');
    const preview = vi.fn(async () => true);
    const { result } = renderHook(() => useViewAsParam(admin, false, preview), { wrapper });
    expect(preview).toHaveBeenCalledWith({ email: 'amara@example.com' }, '/admin/mentors');
    expect(here()).toBe('/admin/mentors');
    expect(result.current).toBe(false);
  });

  it('mid-preview (the viewer is the previewed person): switches to that email', () => {
    visit('/home?viewAs=tunde%40example.com');
    const preview = vi.fn(async () => true);
    renderHook(() => useViewAsParam(member(), true, preview), { wrapper });
    expect(preview).toHaveBeenCalledWith({ email: 'tunde@example.com' }, '/home');
  });

  it('handles a URL once, across re-renders', () => {
    visit('/admin?viewAs=amara%40example.com');
    const preview = vi.fn(async () => true);
    const { rerender } = renderHook(() => useViewAsParam(admin, false, preview), { wrapper });
    rerender();
    expect(preview).toHaveBeenCalledOnce();
  });

  it('an unknown email: the bar opens with the red note (missed)', async () => {
    visit('/admin/mentors?viewAs=ghost%40example.com');
    h.POST.mockResolvedValueOnce({
      data: undefined,
      error: {},
      response: new Response(null, { status: 404 }),
    });
    renderHook(() => useViewAsParam(admin, false, usePreviewActions().preview), { wrapper });
    await waitFor(() =>
      expect(previewStore.get()).toMatchObject({ open: true, miss: 'ghost@example.com' }),
    );
    expect(h.POST).toHaveBeenCalledWith('/api/v1/admin/preview-sessions', {
      body: { email: 'ghost@example.com' },
    });
    expect(previewStore.get().sessionId).toBeNull();
  });
});
