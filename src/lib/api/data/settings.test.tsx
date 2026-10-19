import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import { SAVE_COPY } from '@/lib/copy/settings';
import { keys } from './keys';
import {
  ProfileSaveError,
  profileBody,
  toMenteeProfile,
  useSaveMenteeProfile,
  type MenteeProfile,
} from './settings';

const PUT = vi.fn();
const PATCH = vi.fn();
vi.mock('./http', () => ({
  api: {
    PUT: (...a: unknown[]) => PUT(...a),
    PATCH: (...a: unknown[]) => PATCH(...a),
  },
}));

const values = {
  name: 'Amaka Obi',
  countryId: 'ng',
  languages: [{ id: 'en', label: 'English' }],
  bio: '',
  bioDrafted: false,
};
const ok = { response: { ok: true, status: 204 } };
const fail = (status: number) => ({ response: { ok: false, status }, error: {} });

beforeEach(() => {
  PUT.mockReset();
  PATCH.mockReset();
});

describe('toMenteeProfile', () => {
  it('reads the names, the country (by code, to the catalog id), languages and the drafted bio', () => {
    const p = toMenteeProfile(
      {
        email: 'amaka@example.com',
        first_name: 'Amaka',
        last_name: 'Obi',
        languages: [{ id: 'en', display_name: 'English', code: 'en' }],
        profile: {
          cover_art: 'none',
          about_me: 'Hi',
          about_me_drafted_at: '2026-10-19T00:00:00Z',
          avatar_url: null,
          current_country: { code: 'NG', display_name: 'Nigeria' },
        },
      },
      [{ id: 'ng-id', label: 'Nigeria', code: 'NG' }],
    );
    expect(p).toMatchObject({
      name: 'Amaka Obi',
      countryId: 'ng-id',
      languages: [{ id: 'en', label: 'English' }],
      bio: 'Hi',
      bioDrafted: true,
      initial: 'A',
    });
  });

  it('nothing saved yet: blanks, and the email’s initial', () => {
    const p = toMenteeProfile({ email: 'zed@example.com', profile: null, languages: [] });
    expect(p).toMatchObject({ name: '', countryId: '', languages: [], bio: '', initial: 'Z' });
  });
});

describe('profileBody', () => {
  it('only what changed: a new name and country', () => {
    expect(
      profileBody({
        before: values,
        after: { ...values, name: 'Amaka N. Obi', countryId: 'gh' },
        promptVersion: null,
      }),
    ).toEqual({ full_name: 'Amaka N. Obi', current_country_id: 'gh' });
  });

  it('a kept AI draft carries its prompt version; a blank bio clears it', () => {
    expect(
      profileBody({
        before: values,
        after: { ...values, bio: 'Drafted.', bioDrafted: true },
        promptVersion: 'v3',
      }),
    ).toEqual({ about_me: 'Drafted.', about_me_drafted: true, about_me_prompt_version: 'v3' });
    expect(
      profileBody({ before: { ...values, bio: 'x' }, after: values, promptVersion: null }),
    ).toEqual({ about_me: null, about_me_drafted: false });
  });
});

describe('useSaveMenteeProfile', () => {
  const cached: MenteeProfile = { ...values, photoUrl: null, initial: 'A' };
  function setup() {
    const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    qc.setQueryData(keys.viewer.settings('u1'), cached);
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );
    return { qc, ...renderHook(() => useSaveMenteeProfile('u1'), { wrapper }) };
  }
  const run = async (
    hook: { current: ReturnType<typeof useSaveMenteeProfile> },
    after: typeof values,
  ) => {
    let error: unknown = null;
    await act(async () => {
      await hook.current
        .mutateAsync({ before: values, after, promptVersion: null })
        .catch((e) => (error = e));
    });
    return error as ProfileSaveError | null;
  };
  const twoLangs = [
    { id: 'en', label: 'English' },
    { id: 'ig', label: 'Igbo' },
  ];

  it('the profile, then the languages; both land in the cached read at once', async () => {
    PATCH.mockResolvedValue(ok);
    PUT.mockResolvedValue(ok);
    const { qc, result } = setup();
    const after = { ...values, name: 'Amaka N. Obi', languages: twoLangs };
    expect(await run(result, after)).toBeNull();
    expect(PATCH.mock.calls[0]![1]).toMatchObject({ body: { full_name: 'Amaka N. Obi' } });
    expect(PUT.mock.calls[0]![1]).toMatchObject({
      body: { languages: [{ language_id: 'en' }, { language_id: 'ig' }] },
    });
    expect(qc.getQueryData<MenteeProfile>(keys.viewer.settings('u1'))).toMatchObject(after);
  });

  it('nothing but languages changed: no profile write', async () => {
    PUT.mockResolvedValue(ok);
    const { result } = setup();
    expect(await run(result, { ...values, languages: twoLangs })).toBeNull();
    expect(PATCH).not.toHaveBeenCalled();
  });

  it('the profile failed: "We couldn’t save your profile", nothing written to the cache', async () => {
    PATCH.mockResolvedValue(fail(500));
    const { qc, result } = setup();
    const e = await run(result, { ...values, name: 'Amaka N. Obi', languages: twoLangs });
    expect(e).toBeInstanceOf(ProfileSaveError);
    expect(e!.copy).toBe(SAVE_COPY.profileFailed);
    expect(e!.profileSaved).toBe(false);
    expect(PUT).not.toHaveBeenCalled();
    expect(qc.getQueryData<MenteeProfile>(keys.viewer.settings('u1'))!.name).toBe('Amaka Obi');
  });

  it('the profile landed, the languages didn’t: says which, and caches only what landed', async () => {
    PATCH.mockResolvedValue(ok);
    PUT.mockResolvedValue(fail(500));
    const { qc, result } = setup();
    const e = await run(result, { ...values, name: 'Amaka N. Obi', languages: twoLangs });
    expect(e!.copy).toBe(SAVE_COPY.languagesFailed);
    expect(e!.profileSaved).toBe(true);
    expect(qc.getQueryData<MenteeProfile>(keys.viewer.settings('u1'))).toMatchObject({
      name: 'Amaka N. Obi',
      languages: values.languages,
    });
  });

  it('offline: says so', async () => {
    PATCH.mockRejectedValue(new TypeError('Failed to fetch'));
    const online = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    const { result } = setup();
    const e = await run(result, { ...values, name: 'Amaka N. Obi' });
    expect(e!.copy).toBe(SAVE_COPY.profileOffline);
    online.mockRestore();
  });
});
