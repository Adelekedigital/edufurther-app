import {
  lastInit,
  MENTOR_PROFILE,
  PROXY_SECRET,
  serverGet as get,
  stubServerEnv,
} from './_test/serverReadHarness';
import type * as MentorPreviewModule from './mentorPreview';

vi.mock('openapi-fetch', async () => (await import('./_test/serverReadHarness')).openapiFetch);

const { lookupMentorPreviewOnServer, MENTOR_PREVIEW_REVALIDATE_S }: typeof MentorPreviewModule =
  await import('./mentorPreview');

beforeEach(stubServerEnv);
afterEach(() => vi.unstubAllEnvs());

describe('lookupMentorPreviewOnServer', () => {
  it('reads the public profile with the origin-lock header, no token, cached and tagged', async () => {
    get.mockResolvedValue({ data: MENTOR_PROFILE });
    expect(await lookupMentorPreviewOnServer('gbenga', '')).toEqual({
      id: 'm-1',
      name: 'Gbenga Elufisan',
      initials: 'GE',
      cover: 'mint',
      photoUrl: MENTOR_PROFILE.avatar_url,
      headline: 'Moved from Lagos to Toronto for an MSc.',
      school: 'University of Toronto',
      topics: [
        'School selection',
        'Visa and interview',
        'Application documents',
        'Career guidance',
      ],
    });
    expect(get.mock.calls[0]![0]).toBe('/api/v1/mentors/{handle}');
    const init = lastInit();
    expect(init.params).toEqual({ path: { handle: 'gbenga' } });
    expect(init.headers).toEqual({ 'x-edufurther-proxy-secret': PROXY_SECRET });
    expect(init.next).toEqual({
      revalidate: MENTOR_PREVIEW_REVALIDATE_S,
      tags: ['mentor-preview:gbenga'],
    });
  });

  it('a photo off our own public storage is dropped (the initials draw instead)', async () => {
    get.mockResolvedValue({
      data: { ...MENTOR_PROFILE, avatar_url: 'https://tracker.test/p.gif' },
    });
    expect((await lookupMentorPreviewOnServer('gbenga', ''))?.photoUrl).toBeNull();
  });

  it('null for a hidden or missing profile (404), a failure, or no name', async () => {
    get.mockResolvedValueOnce({ data: undefined, response: { status: 404 } });
    expect(await lookupMentorPreviewOnServer('hidden', '')).toBeNull();
    get.mockRejectedValueOnce(new Error('timeout'));
    expect(await lookupMentorPreviewOnServer('gbenga', '')).toBeNull();
    get.mockResolvedValueOnce({ data: { ...MENTOR_PROFILE, first_name: ' ', last_name: null } });
    expect(await lookupMentorPreviewOnServer('gbenga', '')).toBeNull();
  });

  it('never sends a handle that isn’t a slug or an id (no path tricks)', async () => {
    get.mockResolvedValue({ data: MENTOR_PROFILE });
    for (const bad of [
      '',
      '.',
      '..',
      'a/b',
      '../me',
      '%2e%2e',
      'a b',
      'a?x=1',
      '-a',
      'a'.repeat(129),
    ])
      expect(await lookupMentorPreviewOnServer(bad, '')).toBeNull();
    expect(get).not.toHaveBeenCalled();
    await lookupMentorPreviewOnServer('3f2b8c1e-4d5a-4b6c-9e7f-0a1b2c3d4e5f', '');
    await lookupMentorPreviewOnServer('olajuwon-samuel', '');
    await lookupMentorPreviewOnServer('o2', '');
    expect(get).toHaveBeenCalledTimes(3);
  });

  it('asks the in-app mock, without the secret, while a mock viewer is set', async () => {
    vi.stubEnv('NEXT_PUBLIC_MOCK_VIEWER', 'mentor');
    get.mockResolvedValue({ data: MENTOR_PROFILE });
    await lookupMentorPreviewOnServer('gbenga', 'http://localhost:3111');
    expect(lastInit().headers).toEqual({});
  });
});
