import { RESOLVE_IN_BROWSER } from '@/lib/api/data/home';

// `/` itself: which of the two answers it gives (lib/api/data/home decides).
const h = vi.hoisted(() => ({
  home: '/dashboard' as string,
  redirect: vi.fn((to: string) => {
    throw Object.assign(new Error('NEXT_REDIRECT'), { to });
  }),
  fetchHome: vi.fn(),
}));
vi.mock('next/headers', () => ({
  headers: async () => new Headers({ 'x-ef-access-token': 'tok' }),
}));
vi.mock('next/navigation', () => ({ redirect: h.redirect }));
vi.mock('@/lib/api/data/home', async (orig) => ({
  ...(await orig<typeof import('@/lib/api/data/home')>()),
  fetchHome: h.fetchHome,
}));
vi.mock('./_shell/HomeResolver', () => ({ HomeResolver: () => null }));

const { default: Home } = await import('./page');
const { HomeResolver } = await import('./_shell/HomeResolver');

const open = () => Home({ searchParams: Promise.resolve({}) });

beforeEach(() => {
  h.redirect.mockClear();
  h.fetchHome.mockReset();
});

describe('/', () => {
  it('a known viewer: redirected to their home, with the proxy’s token used to find it', async () => {
    h.fetchHome.mockResolvedValue('/dashboard');
    await expect(open()).rejects.toMatchObject({ to: '/dashboard' });
    expect(h.fetchHome).toHaveBeenCalledWith({ accessToken: 'tok', mockViewer: null });
  });

  it('a viewer the server couldn’t place in time: the browser resolver, never a redirect', async () => {
    h.fetchHome.mockResolvedValue(RESOLVE_IN_BROWSER);
    const el = await open();
    expect(el).toMatchObject({ type: HomeResolver });
    expect(h.redirect).not.toHaveBeenCalled();
  });
});
