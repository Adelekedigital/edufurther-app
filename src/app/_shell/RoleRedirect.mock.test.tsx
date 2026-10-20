import { act } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Dev and CI only: the mock viewer with `?mockViewer=`, which the server can't
// see. Hydrated for real, so the first paint uses the server snapshots.
const h = vi.hoisted(() => ({ pathname: '/calendar', replace: vi.fn() }));
vi.mock('next/navigation', () => ({
  usePathname: () => h.pathname,
  useRouter: () => ({ replace: h.replace }),
}));

const { RoleRedirect } = await import('./RoleRedirect');
const { useViewer } = await import('@/lib/api/data/viewer');

const seen: string[] = [];
function Page() {
  const v = useViewer();
  seen.push(v.kind === 'member' ? `member:${v.id}` : v.kind);
  return <h1>The page</h1>;
}

async function hydrate(url: string) {
  window.history.replaceState(null, '', url);
  h.pathname = new URL(url, 'http://x').pathname;
  const qc = new QueryClient();
  const tree = (
    <QueryClientProvider client={qc}>
      <RoleRedirect>
        <Page />
      </RoleRedirect>
    </QueryClientProvider>
  );
  const container = document.createElement('div');
  container.innerHTML = renderToString(tree);
  document.body.appendChild(container);
  await act(async () => {
    hydrateRoot(container, tree);
  });
  return container;
}

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_MOCK_VIEWER', 'mentee');
  h.replace.mockClear();
  seen.length = 0;
  document.body.innerHTML = '';
});
afterEach(() => {
  vi.unstubAllEnvs();
  window.history.replaceState(null, '', '/');
});

describe('RoleRedirect waits for the mock param (dev, CI)', () => {
  it('?mockViewer=mentor on /calendar: loading first, then the mentor, never a redirect', async () => {
    const page = await hydrate('/calendar?mockViewer=mentor');
    expect(seen[0]).toBe('loading');
    expect(seen.at(-1)).toBe('member:mock-mentor');
    expect(h.replace).not.toHaveBeenCalled();
    expect(page.textContent).toContain('The page');
  });

  it('?mockViewer=mentor-unsubmitted on /calendar stays (the page shows its setup lock)', async () => {
    await hydrate('/calendar?mockViewer=mentor-unsubmitted');
    expect(h.replace).not.toHaveBeenCalled();
  });

  it('a mentee by param on a mentor page still goes home, keeping the param', async () => {
    await hydrate('/calendar?mockViewer=mentee');
    expect(h.replace).toHaveBeenCalledTimes(1);
    expect(h.replace).toHaveBeenCalledWith('/home?mockViewer=mentee');
  });
});
