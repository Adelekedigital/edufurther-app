import type { MentorPreview } from '@/lib/api/data/mentorPreview';

// The profile route: an id link to a mentor with a slug 308s to the slug link.
const h = vi.hoisted(() => ({
  permanentRedirect: vi.fn((to: string) => {
    throw Object.assign(new Error('NEXT_REDIRECT'), { to });
  }),
  lookup: vi.fn<(handle: string, origin: string) => Promise<MentorPreview | null>>(),
}));
vi.mock('next/navigation', () => ({ permanentRedirect: h.permanentRedirect }));
vi.mock('@/lib/api/data/mentorPreview', () => ({
  lookupMentorPreviewOnServer: (handle: string, origin: string) => h.lookup(handle, origin),
}));
vi.mock('@/lib/api/data/serverBackend', () => ({ mockOrigin: async () => '' }));
vi.mock('./_components/MentorProfileScreen', () => ({ MentorProfileScreen: () => null }));

const { default: MentorProfilePage } = await import('./page');

const ID = '3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b';
const MENTOR: MentorPreview = {
  id: ID,
  slug: 'gbenga-e',
  name: 'Gbenga Elufisan',
  initials: 'GE',
  cover: 'mint',
  photoUrl: null,
  headline: null,
  school: null,
  topics: [],
};

const open = (handle: string, query: Record<string, string | string[] | undefined> = {}) =>
  MentorProfilePage({ params: Promise.resolve({ handle }), searchParams: Promise.resolve(query) });

beforeEach(() => {
  h.permanentRedirect.mockClear();
  h.lookup.mockReset();
});

describe('/mentors/[handle]', () => {
  it('an id link to a mentor with a slug: 308 to the slug link, the query kept', async () => {
    h.lookup.mockResolvedValue(MENTOR);
    await expect(
      open(ID, { book: 't-1', at: '2026-11-20T10:00:00Z', tab: ['reviews', 'about'] }),
    ).rejects.toMatchObject({
      to: '/mentors/gbenga-e?book=t-1&at=2026-11-20T10%3A00%3A00Z&tab=reviews&tab=about',
    });
    expect(h.lookup).toHaveBeenCalledWith(ID, '');
  });

  it('an id link with no query: the bare slug link', async () => {
    h.lookup.mockResolvedValue(MENTOR);
    await expect(open(ID)).rejects.toMatchObject({ to: '/mentors/gbenga-e' });
  });

  it('a slug link renders and is never looked up again (no loop)', async () => {
    expect(await open('gbenga-e', { book: 't-1' })).toBeTruthy();
    expect(h.lookup).not.toHaveBeenCalled();
    expect(h.permanentRedirect).not.toHaveBeenCalled();
  });

  it('an id link to a mentor with no slug yet renders on the id', async () => {
    h.lookup.mockResolvedValue({ ...MENTOR, slug: null });
    expect(await open(ID)).toBeTruthy();
    expect(h.permanentRedirect).not.toHaveBeenCalled();
  });

  it('a hidden, missing or failed read renders: the screen says so', async () => {
    h.lookup.mockResolvedValue(null);
    expect(await open(ID)).toBeTruthy();
    expect(h.permanentRedirect).not.toHaveBeenCalled();
  });
});
