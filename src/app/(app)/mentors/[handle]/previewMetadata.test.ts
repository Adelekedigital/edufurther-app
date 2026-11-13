import type * as MentorPreviewModule from '@/lib/api/data/mentorPreview';
import { mentorPreviewMetadata } from './previewMetadata';
import { revalidate } from './opengraph-image';

const get = vi.fn();
vi.mock('openapi-fetch', () => ({ default: () => ({ GET: (...a: unknown[]) => get(...a) }) }));
vi.mock('next/og', () => ({ ImageResponse: class {} }));

const { lookupMentorPreviewOnServer, MENTOR_PREVIEW_REVALIDATE_S }: typeof MentorPreviewModule =
  await import('@/lib/api/data/mentorPreview');

const PROFILE = {
  id: 'm-1',
  first_name: 'Gbenga',
  last_name: 'Elufisan',
  headline: 'Moved from Lagos to Toronto for an MSc.',
  avatar_url: 'https://abc.supabase.co/storage/a.png',
  cover_color: 'mint',
  education: [{ institution: 'University of Toronto' }],
  offerings: [
    { slug: 'school-selection', display_name: 'School selection' },
    { slug: 'visa', display_name: 'Visa and interview' },
    { slug: 'docs', display_name: 'Application documents' },
    { slug: 'career', display_name: 'Career guidance' },
  ],
};

beforeEach(() => {
  get.mockReset();
  vi.stubEnv('NEXT_PUBLIC_MOCK_VIEWER', '');
  vi.stubEnv('BACKEND_URL', 'https://api.example.test');
  vi.stubEnv('EDGE_PROXY_SECRET', 'x'.repeat(40));
});
afterEach(() => vi.unstubAllEnvs());

describe('mentorPreviewMetadata', () => {
  it('names the mentor and describes them from headline, school and help areas', async () => {
    get.mockResolvedValue({ data: PROFILE });
    const m = mentorPreviewMetadata(await lookupMentorPreviewOnServer('gbenga', ''));
    const description =
      'Moved from Lagos to Toronto for an MSc. Studied at University of Toronto. Helps with School selection, Visa and interview, Application documents.';
    expect(m.title).toBe('Gbenga Elufisan');
    expect(m.description).toBe(description);
    expect(m.openGraph).toMatchObject({
      title: 'Gbenga Elufisan · EduFurther mentor',
      description,
    });
    expect(m.twitter).toMatchObject({
      card: 'summary_large_image',
      title: 'Gbenga Elufisan · EduFurther mentor',
    });
  });

  it('a sparse profile describes only what it has', async () => {
    get.mockResolvedValue({
      data: { ...PROFILE, headline: null, education: [], offerings: [] },
    });
    const sparse = mentorPreviewMetadata(await lookupMentorPreviewOnServer('gbenga', ''));
    expect(sparse.openGraph).toMatchObject({
      description: 'A mentor on EduFurther who’s been through it.',
    });
  });

  it('a headline that names the school isn’t followed by it again', async () => {
    get.mockResolvedValue({
      data: { ...PROFILE, headline: 'MSc Computer Science · University of Toronto', offerings: [] },
    });
    const m = mentorPreviewMetadata(await lookupMentorPreviewOnServer('gbenga', ''));
    expect(m.description).toBe('MSc Computer Science · University of Toronto.');
  });

  it('falls back to the generic preview, never an error, when there is no profile', () => {
    const m = mentorPreviewMetadata(null);
    expect(m.title).toBe('Mentor profile');
    expect(m.openGraph).toMatchObject({
      title: 'Find a mentor on EduFurther',
      description:
        '1:1 help with your grad school applications from mentors who’ve been through it.',
    });
    expect(m.twitter).toMatchObject({ title: 'Find a mentor on EduFurther' });
  });
});

describe('opengraph-image', () => {
  it('the image route revalidates as often as the lookup', () => {
    expect(revalidate).toBe(MENTOR_PREVIEW_REVALIDATE_S);
  });
});
