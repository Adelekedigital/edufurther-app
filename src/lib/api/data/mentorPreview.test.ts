import type * as MentorPreviewModule from './mentorPreview';

const get = vi.fn();
vi.mock('openapi-fetch', () => ({ default: () => ({ GET: (...a: unknown[]) => get(...a) }) }));

const { lookupMentorPreviewOnServer, MENTOR_PREVIEW_REVALIDATE_S }: typeof MentorPreviewModule =
  await import('./mentorPreview');

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

describe('lookupMentorPreviewOnServer', () => {
  it('reads the public profile with the origin-lock header, no token, cached', async () => {
    get.mockResolvedValue({ data: PROFILE });
    expect(await lookupMentorPreviewOnServer('gbenga', '')).toEqual({
      id: 'm-1',
      name: 'Gbenga Elufisan',
      initials: 'GE',
      cover: 'mint',
      photoUrl: 'https://abc.supabase.co/storage/a.png',
      headline: 'Moved from Lagos to Toronto for an MSc.',
      school: 'University of Toronto',
      topics: [
        'School selection',
        'Visa and interview',
        'Application documents',
        'Career guidance',
      ],
    });
    const init = get.mock.calls[0]![1];
    expect(init.params).toEqual({ path: { handle: 'gbenga' } });
    expect(init.headers).toEqual({ 'x-edufurther-proxy-secret': 'x'.repeat(40) });
    expect(init.next).toEqual({ revalidate: MENTOR_PREVIEW_REVALIDATE_S });
  });

  it('a photo off our image host is dropped (the initials draw instead)', async () => {
    get.mockResolvedValue({ data: { ...PROFILE, avatar_url: 'https://tracker.test/p.gif' } });
    expect((await lookupMentorPreviewOnServer('gbenga', ''))?.photoUrl).toBeNull();
  });

  it('null for a hidden or missing profile (404), a failure, no name, or a bad handle', async () => {
    get.mockResolvedValueOnce({ data: undefined, response: { status: 404 } });
    expect(await lookupMentorPreviewOnServer('hidden', '')).toBeNull();
    get.mockRejectedValueOnce(new Error('timeout'));
    expect(await lookupMentorPreviewOnServer('gbenga', '')).toBeNull();
    get.mockResolvedValueOnce({ data: { ...PROFILE, first_name: ' ', last_name: null } });
    expect(await lookupMentorPreviewOnServer('gbenga', '')).toBeNull();
    expect(await lookupMentorPreviewOnServer('a/b', '')).toBeNull();
    expect(await lookupMentorPreviewOnServer('', '')).toBeNull();
    expect(get).toHaveBeenCalledTimes(3);
  });

  it('asks the in-app mock, without the secret, while a mock viewer is set', async () => {
    vi.stubEnv('NEXT_PUBLIC_MOCK_VIEWER', 'mentor');
    get.mockResolvedValue({ data: PROFILE });
    await lookupMentorPreviewOnServer('gbenga', 'http://localhost:3111');
    expect(get.mock.calls[0]![1].headers).toEqual({});
  });
});
