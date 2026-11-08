import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { components } from '@/lib/api/generated/schema';
import { previewStore, resetPreviewStoreForTests } from '@/lib/api/data/previewStore';
import type { Viewer } from '@/types/mentor';
import { PreviewRoot } from './PreviewRoot';

type Schemas = components['schemas'];

const h = vi.hoisted(() => ({
  GET: vi.fn(),
  POST: vi.fn(),
  pageView: vi.fn(async (..._a: unknown[]) => ({ response: new Response(null, { status: 204 }) })),
  PATCH: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
  pathname: '/admin/mentors',
  viewer: {
    kind: 'member',
    id: 'admin-1',
    isAdmin: true,
    canPreviewAsUser: true,
  } as unknown as Viewer,
}));
vi.mock('@/lib/api/data/http', () => ({
  api: {
    GET: (...a: unknown[]) => h.GET(...a),
    // The page-view log has its own mock, so the start/exit calls read in order.
    POST: (path: string, ...a: unknown[]) =>
      path.endsWith('/page-views') ? h.pageView(path, ...a) : h.POST(path, ...a),
    PATCH: (...a: unknown[]) => h.PATCH(...a),
  },
}));
vi.mock('next/navigation', () => ({
  usePathname: () => h.pathname,
  useRouter: () => ({ push: h.push, replace: h.replace }),
}));
vi.mock('@/lib/api/data/session', () => ({
  useSession: () => ({ status: 'present', userId: 'admin-1' }),
}));
vi.mock('@/lib/api/data/viewer', () => ({ useViewer: () => h.viewer }));

const row = (o: Partial<Schemas['AdminUserRead']> = {}): Schemas['AdminUserRead'] => ({
  user_id: 'u-1',
  email: 'amara.okafor@example.com',
  first_name: 'Amara',
  last_name: 'Okafor',
  role: 'mentee',
  ...o,
});
const tunde = row({
  user_id: 'u-2',
  email: 'tunde.bello@example.com',
  first_name: 'Tunde',
  last_name: 'Bello',
  role: 'mentor',
});
const session = (
  o: Partial<Schemas['PreviewSessionRead']> = {},
): Schemas['PreviewSessionRead'] => ({
  id: 's-1',
  user: row(),
  started_at: '2026-11-07T10:00:00Z',
  expires_at: '2026-11-07T12:00:00Z',
  revealed: false,
  can_reveal: false,
  ended_at: null,
  end_reason: null,
  ...o,
});
const ok = (data: unknown, status = 200) => ({ data, response: new Response(null, { status }) });

function answerUsers(users = [row(), tunde]) {
  h.GET.mockImplementation(async (path: string) =>
    path === '/api/v1/admin/users' ? ok({ data: users, next_cursor: null }) : ok(session()),
  );
}

const renderRoot = () =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <PreviewRoot>
        <p>The page</p>
      </PreviewRoot>
    </QueryClientProvider>,
  );

const bar = () => screen.queryByRole('region', { name: 'Preview as user' });
const previewing = () => 'previewing' in document.documentElement.dataset;

const startAmara = (from: string | null = '/admin/mentors') =>
  previewStore.started(
    's-1',
    {
      id: 'u-1',
      email: 'amara.okafor@example.com',
      name: 'Amara Okafor',
      firstName: 'Amara',
      initials: 'AO',
      role: 'mentee',
    },
    { revealed: false, canReveal: false },
    from,
  );

beforeEach(() => {
  for (const f of [h.GET, h.POST, h.PATCH, h.push, h.replace]) f.mockReset();
  h.pageView.mockClear();
  h.pathname = '/admin/mentors';
  sessionStorage.clear();
  resetPreviewStoreForTests();
});

describe('PreviewRoot: the bar', () => {
  it('nobody previewed and not opened: no bar, html not marked', () => {
    renderRoot();
    expect(bar()).toBeNull();
    expect(previewing()).toBe(false);
    expect(h.GET).not.toHaveBeenCalled();
  });

  it('the icon opens it: "Choose a user", the picker searching, html marked', async () => {
    answerUsers();
    renderRoot();
    act(() => previewStore.open());
    expect(bar()).not.toBeNull();
    expect(previewing()).toBe(true);
    expect(screen.getByRole('button', { name: 'Choose a user to preview as' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(await screen.findAllByRole('option')).toHaveLength(2);
    expect(screen.getByRole('combobox')).toHaveFocus();
  });

  it('picking someone starts the preview from this page and opens their Home', async () => {
    answerUsers();
    h.POST.mockResolvedValueOnce(ok(session(), 201));
    renderRoot();
    act(() => previewStore.open());
    await userEvent.click(await screen.findByRole('option', { name: /amara\.okafor/ }));
    await waitFor(() => expect(h.push).toHaveBeenCalledWith('/home'));
    expect(h.POST).toHaveBeenCalledWith('/api/v1/admin/preview-sessions', {
      body: { user_id: 'u-1' },
    });
    expect(previewStore.get().startedFrom).toBe('/admin/mentors');
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(
      screen.getByRole('button', { name: 'Previewing as amara.okafor@example.com. Switch user' }),
    ).toBeInTheDocument();
    expect(bar()).toHaveTextContent('Amara Okafor · Mentee');
  });

  it('switching: PATCHes the live session; picking the same person only closes', async () => {
    answerUsers();
    startAmara();
    h.PATCH.mockResolvedValueOnce(ok(session({ user: tunde })));
    renderRoot();
    const pick = screen.getByRole('button', { name: /Switch user/ });
    await userEvent.click(pick);
    expect(await screen.findAllByRole('option')).toHaveLength(2);
    expect(screen.getByRole('option', { name: /amara\.okafor/ })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await userEvent.click(screen.getByRole('option', { name: /amara\.okafor/ }));
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(h.PATCH).not.toHaveBeenCalled();

    await userEvent.click(pick);
    await userEvent.click(await screen.findByRole('option', { name: /tunde\.bello/ }));
    await waitFor(() => expect(h.push).toHaveBeenCalledWith('/dashboard'));
    expect(h.PATCH.mock.calls[0]![1]).toMatchObject({ body: { user_id: 'u-2' } });
  });

  it('a pick that fails keeps the picker open with the note', async () => {
    answerUsers();
    h.POST.mockResolvedValueOnce({
      data: undefined,
      error: {},
      response: new Response(null, { status: 500 }),
    });
    renderRoot();
    act(() => previewStore.open());
    await userEvent.click(await screen.findByRole('option', { name: /amara\.okafor/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'We couldn’t open that preview. Try again.',
    );
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('a ?viewAs= miss: the bar opens with the red note', async () => {
    answerUsers();
    renderRoot();
    act(() => previewStore.missed('ghost@example.com'));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No user matches “ghost@example.com”. Pick someone below.',
    );
  });

  it('the users failing to load: the error state, and Try again asks again', async () => {
    h.GET.mockResolvedValue({
      data: undefined,
      error: {},
      response: new Response(null, { status: 403 }),
    });
    renderRoot();
    act(() => previewStore.open());
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('We couldn’t load users.');
    answerUsers();
    await userEvent.click(within(alert).getByRole('button', { name: 'Try again' }));
    expect(await screen.findAllByRole('option')).toHaveLength(2);
  });

  it('Escape closes the picker and puts focus back on its button', async () => {
    answerUsers();
    startAmara();
    renderRoot();
    await userEvent.click(screen.getByRole('button', { name: /Switch user/ }));
    await screen.findAllByRole('option');
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('combobox')).toBeNull();
    expect(screen.getByRole('button', { name: /Switch user/ })).toHaveFocus();
  });

  it('Exit ends the session and goes back to where it started', async () => {
    startAmara('/admin/credits');
    h.POST.mockResolvedValueOnce(ok(null, 204));
    renderRoot();
    await userEvent.click(screen.getByRole('button', { name: 'Exit preview' }));
    expect(h.push).toHaveBeenCalledWith('/admin/credits');
    expect(h.POST.mock.calls[0]![1]).toMatchObject({ body: { reason: 'exit' } });
    expect(bar()).toBeNull();
    expect(previewing()).toBe(false);
  });

  it('after a refresh: the stored session is read back, and the bar names them', async () => {
    sessionStorage.setItem('ef-preview', JSON.stringify({ id: 's-1', from: '/admin/mentors' }));
    h.GET.mockResolvedValueOnce(ok(session()));
    renderRoot();
    expect(
      await screen.findByRole('button', {
        name: 'Previewing as amara.okafor@example.com. Switch user',
      }),
    ).toBeInTheDocument();
  });
});

describe('PreviewRoot: the page and the page-view log', () => {
  it('renders the page under the bar', () => {
    renderRoot();
    expect(screen.getByText('The page')).toBeInTheDocument();
  });

  it('logs each path once per arrival, without the query string, only while previewing', () => {
    const view = renderRoot();
    expect(h.pageView).not.toHaveBeenCalled();
    act(() => startAmara());
    expect(h.pageView).toHaveBeenCalledOnce();
    expect(h.pageView).toHaveBeenCalledWith(
      '/api/v1/admin/preview-sessions/{preview_id}/page-views',
      { params: { path: { preview_id: 's-1' } }, body: { path: '/admin/mentors' } },
    );
    view.rerender(
      <QueryClientProvider client={new QueryClient()}>
        <PreviewRoot>
          <p>The page</p>
        </PreviewRoot>
      </QueryClientProvider>,
    );
    expect(h.pageView).toHaveBeenCalledOnce();
    h.pathname = '/home';
    view.rerender(
      <QueryClientProvider client={new QueryClient()}>
        <PreviewRoot>
          <p>The page</p>
        </PreviewRoot>
      </QueryClientProvider>,
    );
    expect(h.pageView).toHaveBeenCalledTimes(2);
    expect(h.pageView.mock.calls[1]![1]).toMatchObject({ body: { path: '/home' } });
  });

  it('between identities: the page being left is neither drawn nor logged (code review)', () => {
    const view = renderRoot();
    act(() => {
      previewStore.leave('/admin/mentors', '/home');
      startAmara();
    });
    expect(screen.queryByText('The page')).toBeNull();
    expect(h.pageView).not.toHaveBeenCalled();
    h.pathname = '/home';
    view.rerender(
      <QueryClientProvider client={new QueryClient()}>
        <PreviewRoot>
          <p>The page</p>
        </PreviewRoot>
      </QueryClientProvider>,
    );
    expect(screen.getByText('The page')).toBeInTheDocument();
    expect(previewStore.get().leaving).toBeNull();
    expect(h.pageView).toHaveBeenCalledOnce();
    expect(h.pageView.mock.calls[0]![1]).toMatchObject({ body: { path: '/home' } });
  });

  it('a failed page view is never an error for the admin', async () => {
    h.pageView.mockRejectedValueOnce(new TypeError('offline'));
    renderRoot();
    act(() => startAmara());
    await waitFor(() => expect(h.pageView).toHaveBeenCalled());
    expect(screen.getByText('The page')).toBeInTheDocument();
  });

  it('a denied ?viewAs= on this path: not found instead of the page', () => {
    renderRoot();
    act(() => previewStore.deny('/admin/mentors'));
    expect(screen.queryByText('The page')).toBeNull();
    expect(screen.getByRole('heading', { name: 'We couldn’t find that page' })).toBeInTheDocument();
  });
});

describe('PreviewRoot: the notices', () => {
  it('a refused write: "Read only" naming them; Got it closes it', async () => {
    startAmara();
    renderRoot();
    act(() => previewStore.blocked(true));
    const dialog = screen.getByRole('alertdialog', { name: 'Read only' });
    expect(dialog).toHaveTextContent(
      'You’re previewing as Amara Okafor in production, so nothing was saved or sent.',
    );
    await userEvent.click(within(dialog).getByRole('button', { name: 'Got it' }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(previewStore.get()).toMatchObject({ blocked: false, sessionId: 's-1' });
  });

  it('the server ended it (idle): the cache goes, back where it started, "Preview ended"', async () => {
    startAmara('/admin/credits');
    renderRoot();
    act(() => previewStore.serverEnded('idle'));
    const dialog = screen.getByRole('alertdialog', { name: 'Preview ended' });
    expect(dialog).toHaveTextContent(
      'Your preview of Amara Okafor ended after 30 minutes without activity.',
    );
    expect(h.replace).toHaveBeenCalledWith('/admin/credits');
    expect(bar()).toBeNull();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Got it' }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(h.replace).toHaveBeenCalledOnce();
  });

  it('ended quietly (sign-out elsewhere, not ours): back to / with no notice', () => {
    startAmara(null);
    renderRoot();
    act(() => previewStore.serverEnded(null));
    expect(h.replace).toHaveBeenCalledWith('/');
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(previewStore.get().dropped).toBeNull();
  });
});

describe('PreviewRoot: links the server answers as the admin', () => {
  const linkTo = (href: string) => {
    const a = document.createElement('a');
    a.href = href;
    a.textContent = 'go';
    document.body.appendChild(a);
    return a;
  };

  it('Join shows Read only; a plain click on Home routes to the previewed Home', () => {
    renderRoot();
    act(() => startAmara());
    const join = linkTo('/sessions/s-9/enter');
    act(() => join.click());
    expect(previewStore.get().blocked).toBe(true);
    const home = linkTo('/');
    act(() => home.click());
    expect(h.push).toHaveBeenLastCalledWith('/home');
    join.remove();
    home.remove();
  });

  it('a Ctrl, Cmd or middle click is left to the browser (a new tab opens as the admin)', () => {
    renderRoot();
    act(() => startAmara());
    act(() => previewStore.blocked(false));
    const join = linkTo('/sessions/s-9/enter');
    const ev = new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true });
    act(() => {
      join.dispatchEvent(ev);
    });
    expect(previewStore.get().blocked).toBe(false);
    const meta = new MouseEvent('click', { bubbles: true, cancelable: true, metaKey: true });
    act(() => {
      join.dispatchEvent(meta);
    });
    expect(previewStore.get().blocked).toBe(false);
    join.remove();
  });
});
