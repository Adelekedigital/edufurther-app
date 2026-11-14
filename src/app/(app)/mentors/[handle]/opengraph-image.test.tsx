import type { MentorPreview } from '@/lib/api/data/mentorPreview';
import { MENTOR_PREVIEW_REVALIDATE_S } from '@/lib/api/data/mentorPreview';
import { drawn, lastDrawn } from '@/lib/og/_test/ogHarness';

const lookup = vi.fn<(handle: string, origin: string) => Promise<MentorPreview | null>>();
vi.mock('@/lib/api/data/mentorPreview', async (orig) => ({
  ...(await orig<typeof import('@/lib/api/data/mentorPreview')>()),
  lookupMentorPreviewOnServer: (h: string, o: string) => lookup(h, o),
}));
vi.mock('@/lib/api/data/serverBackend', () => ({ mockOrigin: async () => '' }));
const photo = vi.fn<(url: string | null) => Promise<string | null>>();
vi.mock('next/og', async () => (await import('@/lib/og/_test/ogHarness')).nextOg);
vi.mock('@/lib/og/ogAssets', async (orig) => ({
  ...(await orig<typeof import('@/lib/og/ogAssets')>()),
  ...(await import('@/lib/og/_test/ogHarness')).assetStubs,
  photoData: (url: string | null) => photo(url),
}));
const { default: Image, revalidate } = await import('./opengraph-image');

const MENTOR: MentorPreview = {
  id: 'm-1',
  name: 'Gbenga Elufisan',
  initials: 'GE',
  cover: 'mint',
  photoUrl: null,
  headline: null,
  school: 'University of Toronto',
  topics: ['School selection', 'Visa and interview', 'Application documents', 'Career guidance'],
};
const draw = (handle: string) => Image({ params: Promise.resolve({ handle }) });

beforeEach(() => {
  drawn.length = 0;
  lookup.mockReset();
  photo.mockReset().mockResolvedValue(null);
});

describe('mentor opengraph-image', () => {
  it('draws the name, school, initials and three help areas in one row', async () => {
    lookup.mockResolvedValue(MENTOR);
    await draw('gbenga');
    expect(lookup).toHaveBeenCalledWith('gbenga', '');
    const html = lastDrawn();
    for (const text of ['Gbenga Elufisan', 'University of Toronto', 'GE', 'Application documents'])
      expect(html).toContain(text);
    expect(html).not.toContain('Career guidance');
    expect(html).toMatch(/display:flex;flex-direction:row;flex-wrap:nowrap;gap:12px/);
  });

  it('draws the photo when it loads', async () => {
    lookup.mockResolvedValue({ ...MENTOR, photoUrl: 'https://abc.supabase.co/p.png' });
    photo.mockResolvedValue('data:image/png;base64,AA');
    await draw('gbenga');
    expect(photo).toHaveBeenCalledWith('https://abc.supabase.co/p.png');
    expect(lastDrawn()).toContain('src="data:image/png;base64,AA"');
  });

  it('no public profile: redirects to the one shared fallback, drawing nothing', async () => {
    lookup.mockResolvedValue(null);
    const res = (await draw('nobody')) as Response;
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('/og/mentor-fallback.png');
    expect(drawn).toHaveLength(0);
  });

  it('decodes the handle before the lookup', async () => {
    lookup.mockResolvedValue(null);
    await draw('ad%C3%A9');
    expect(lookup).toHaveBeenCalledWith('adé', '');
  });

  it('revalidates as often as the profile read', () => {
    expect(revalidate).toBe(MENTOR_PREVIEW_REVALIDATE_S);
  });
});
