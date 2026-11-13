/**
 * Shared test pieces for the server-side preview reads (`serverRead`): the
 * generated client's GET, the env a deploy has, and a public mentor profile.
 * Each test file mocks openapi-fetch itself, from here:
 *
 *   vi.mock('openapi-fetch', async () => (await import('./_test/serverReadHarness')).openapiFetch);
 */
export const serverGet = vi.fn();

export const openapiFetch = {
  default: () => ({ GET: (...a: unknown[]) => serverGet(...a) }),
};

export const PROXY_SECRET = 'x'.repeat(40);

/** A deployed backend (no mock viewer), with the origin-lock secret and our storage host. */
export function stubServerEnv() {
  serverGet.mockReset();
  vi.stubEnv('NEXT_PUBLIC_MOCK_VIEWER', '');
  vi.stubEnv('BACKEND_URL', 'https://api.example.test');
  vi.stubEnv('EDGE_PROXY_SECRET', PROXY_SECRET);
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://abc.supabase.co');
}

/** The second argument of the last GET: params, headers, cache options. */
export const lastInit = () => serverGet.mock.calls.at(-1)![1];

/** A public mentor profile (MentorPublicRead), as a guest reads it. */
export const MENTOR_PROFILE = {
  id: 'm-1',
  first_name: 'Gbenga',
  last_name: 'Elufisan',
  headline: 'Moved from Lagos to Toronto for an MSc.',
  avatar_url: 'https://abc.supabase.co/storage/v1/object/public/avatars/a.png',
  cover_color: 'mint',
  education: [{ institution: 'University of Toronto' }],
  offerings: [
    { slug: 'school-selection', display_name: 'School selection' },
    { slug: 'visa', display_name: 'Visa and interview' },
    { slug: 'docs', display_name: 'Application documents' },
    { slug: 'career', display_name: 'Career guidance' },
  ],
};
