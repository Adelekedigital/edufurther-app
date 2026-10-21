import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { MenteeProfile } from '@/lib/api/data/settings';
import { ProfileSaveError } from '@/lib/api/data/settings';
import { unsavedSave } from '@/lib/utils/leaveGuard';
import { SAVE_COPY, SETTINGS_COPY } from '@/lib/copy/settings';
import { ProfilePanel } from './ProfilePanel';

let read: {
  profile: MenteeProfile | null;
  status: 'loading' | 'error' | 'ready';
  retry: () => void;
  retrying: boolean;
};
const mutateAsync = vi.fn();
let saveError: ProfileSaveError | null = null;
vi.mock('@/lib/api/data/settings', async (orig) => ({
  ...(await orig<typeof import('@/lib/api/data/settings')>()),
  useMenteeProfile: () => read,
  useSaveMenteeProfile: () => ({
    mutateAsync,
    isPending: false,
    error: saveError,
    reset: vi.fn(),
  }),
}));
vi.mock('@/lib/api/data/avatar', () => ({
  useAvatarUpload: () => ({
    accept: 'image/png,image/jpeg',
    upload: vi.fn(),
    uploading: false,
    remove: vi.fn(),
    removing: false,
    error: null,
    errorFrom: null,
    dismissError: vi.fn(),
    removedStamp: 0,
  }),
}));
let commonFails = false;
const assist = vi.fn();
const commonRetry = vi.fn();
const LANGS = [
  { id: 'en', label: 'English' },
  { id: 'yo', label: 'Yoruba' },
  { id: 'ig', label: 'Igbo' },
];
vi.mock('@/lib/api/data/catalog', () => ({
  useCountries: () => ({
    countries: [
      { id: 'ng', label: 'Nigeria' },
      { id: 'gh', label: 'Ghana' },
    ],
    status: 'ready',
    retry: vi.fn(),
  }),
  useLanguageSearch: (q: string) =>
    !q && commonFails
      ? { results: [], status: 'error', retry: commonRetry }
      : {
          results: q
            ? LANGS.filter((l) => l.label.toLowerCase().startsWith(q.toLowerCase()))
            : LANGS,
          status: 'ready',
          retry: vi.fn(),
        },
}));
vi.mock('@/lib/api/data/writingAssist', () => ({
  useWritingAssist: () => ({ assist: (...a: unknown[]) => assist(...a) }),
}));

const profile = (over: Partial<MenteeProfile> = {}): MenteeProfile => ({
  name: 'Amaka Obi',
  countryId: 'ng',
  languages: [{ id: 'en', label: 'English' }],
  bio: '',
  bioDrafted: false,
  photoUrl: null,
  initials: 'A',
  email: 'amaka@example.com',
  emailVerified: true,
  upcomingCount: 0,
  requestCount: 0,
  ...over,
});

const ready = (p = profile()) => {
  read = { profile: p, status: 'ready', retry: vi.fn(), retrying: false };
};

beforeEach(() => {
  mutateAsync.mockReset();
  mutateAsync.mockResolvedValue(undefined);
  saveError = null;
  commonFails = false;
  window.scrollBy = vi.fn();
});

describe('ProfilePanel', () => {
  it('loading: the cards’ shapes, announced busy', () => {
    read = { profile: null, status: 'loading', retry: vi.fn(), retrying: false };
    render(<ProfilePanel userId="u1" />);
    expect(screen.getByLabelText('Loading your profile')).toHaveAttribute('aria-busy', 'true');
  });

  it('a failed load says so, with Try again', async () => {
    const retry = vi.fn();
    read = { profile: null, status: 'error', retry, retrying: false };
    render(<ProfilePanel userId="u1" />);
    expect(screen.getByText(SETTINGS_COPY.loadError)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: SETTINGS_COPY.retry }));
    expect(retry).toHaveBeenCalled();
  });

  it('no save bar until something changes; Discard puts the saved values back', async () => {
    ready();
    render(<ProfilePanel userId="u1" />);
    expect(screen.queryByRole('region', { name: SAVE_COPY.barLabel })).toBeNull();
    const name = screen.getByLabelText('Full name');
    await userEvent.clear(name);
    await userEvent.type(name, 'Amaka N. Obi');
    expect(screen.getByRole('region', { name: SAVE_COPY.barLabel })).toHaveTextContent(
      SAVE_COPY.profileBar,
    );
    await userEvent.click(screen.getByRole('button', { name: SAVE_COPY.discard }));
    expect(name).toHaveValue('Amaka Obi');
    expect(screen.queryByRole('region', { name: SAVE_COPY.barLabel })).toBeNull();
  });

  it('Save with gaps: the form line, an error on each field, focus on the first, nothing sent', async () => {
    ready(profile({ countryId: '', languages: [] }));
    render(<ProfilePanel userId="u1" />);
    await userEvent.clear(screen.getByLabelText('Full name'));
    await userEvent.click(screen.getByRole('button', { name: SAVE_COPY.save }));
    expect(screen.getAllByText(SAVE_COPY.formError).length).toBeGreaterThan(0);
    expect(screen.getByText('Add your full name.')).toBeInTheDocument();
    expect(screen.getByText('Select the country you live in.')).toBeInTheDocument();
    expect(screen.getByLabelText('Full name')).toHaveAttribute('aria-invalid', 'true');
    await waitFor(() => expect(screen.getByLabelText('Full name')).toHaveFocus());
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('languages are optional: none saves, with no language error (founder, 21 Oct)', async () => {
    ready(profile({ languages: [] }));
    render(<ProfilePanel userId="u1" />);
    expect(screen.getByText('Languages you speak (optional)')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Full name'), 'x');
    await userEvent.click(screen.getByRole('button', { name: SAVE_COPY.save }));
    expect(screen.queryByText(SAVE_COPY.formError)).toBeNull();
    expect(mutateAsync).toHaveBeenCalled();
  });

  it('Save sends the change and says "Profile saved"; the bar goes', async () => {
    ready();
    render(<ProfilePanel userId="u1" />);
    await userEvent.click(screen.getByRole('button', { name: 'Igbo' }));
    await userEvent.click(screen.getByRole('button', { name: SAVE_COPY.save }));
    expect(mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        before: expect.objectContaining({ languages: [{ id: 'en', label: 'English' }] }),
        after: expect.objectContaining({
          languages: [
            { id: 'en', label: 'English' },
            { id: 'ig', label: 'Igbo' },
          ],
        }),
      }),
    );
    expect(await screen.findByText(SAVE_COPY.profileSaved)).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: SAVE_COPY.barLabel })).toBeNull();
  });

  it('the name landed but the languages didn’t: only the languages stay unsaved', async () => {
    ready();
    mutateAsync.mockRejectedValueOnce(new ProfileSaveError(SAVE_COPY.languagesFailed, true));
    const { rerender } = render(<ProfilePanel userId="u1" />);
    const name = screen.getByLabelText('Full name');
    await userEvent.clear(name);
    await userEvent.type(name, 'Amaka N. Obi');
    await userEvent.click(screen.getByRole('button', { name: 'Igbo' }));
    await userEvent.click(screen.getByRole('button', { name: SAVE_COPY.save }));
    saveError = new ProfileSaveError(SAVE_COPY.languagesFailed, true);
    rerender(<ProfilePanel userId="u1" />);
    expect(screen.getAllByText(SAVE_COPY.languagesFailed).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Igbo' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(screen.getByRole('button', { name: SAVE_COPY.save }));
    expect(mutateAsync).toHaveBeenLastCalledWith(
      expect.objectContaining({
        before: expect.objectContaining({ name: 'Amaka N. Obi', languages: [LANGS[0]] }),
      }),
    );
  });

  it('a one-word name: "Enter your first and last name." by the field, nothing sent', async () => {
    ready();
    render(<ProfilePanel userId="u1" />);
    const name = screen.getByLabelText('Full name');
    await userEvent.clear(name);
    await userEvent.type(name, 'Amaka');
    await userEvent.click(screen.getByRole('button', { name: SAVE_COPY.save }));
    expect(screen.getByText('Enter your first and last name.')).toBeInTheDocument();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('a refetch while clean brings the server’s values in; while editing, it doesn’t', async () => {
    ready();
    const { rerender } = render(<ProfilePanel userId="u1" />);
    ready(profile({ name: 'Amaka Nwosu' }));
    rerender(<ProfilePanel userId="u1" />);
    expect(screen.getByLabelText('Full name')).toHaveValue('Amaka Nwosu');
    await userEvent.click(screen.getByRole('button', { name: 'Igbo' }));
    ready(profile({ name: 'Someone Else' }));
    rerender(<ProfilePanel userId="u1" />);
    expect(screen.getByLabelText('Full name')).toHaveValue('Amaka Nwosu');
    expect(screen.getByRole('button', { name: 'Igbo' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('an edit right after "Profile saved" brings the save bar straight back', async () => {
    ready();
    render(<ProfilePanel userId="u1" />);
    await userEvent.click(screen.getByRole('button', { name: 'Igbo' }));
    await userEvent.click(screen.getByRole('button', { name: SAVE_COPY.save }));
    expect(await screen.findByText(SAVE_COPY.profileSaved)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Yoruba' }));
    expect(screen.getByRole('region', { name: SAVE_COPY.barLabel })).toBeInTheDocument();
    expect(screen.queryByText(SAVE_COPY.profileSaved)).toBeNull();
  });

  it('an unsaved edit registers its own save with the leave guard (Save and continue)', async () => {
    ready();
    render(<ProfilePanel userId="u1" />);
    expect(unsavedSave()).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Igbo' }));
    const save = unsavedSave();
    expect(save).not.toBeNull();
    let saved = false;
    await act(async () => {
      saved = await save!();
    });
    expect(saved).toBe(true);
    expect(mutateAsync).toHaveBeenCalledOnce();
  });

  it('"Add another language" searches the catalog and adds the pick', async () => {
    ready();
    render(<ProfilePanel userId="u1" />);
    await userEvent.click(screen.getByRole('button', { name: 'Add another language' }));
    await userEvent.type(screen.getByRole('combobox', { name: 'Add another language' }), 'yor');
    await userEvent.keyboard('{Enter}');
    expect(screen.getByRole('button', { name: 'Yoruba' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Add another language' })).toBeInTheDocument();
  });

  it('a language off and on again is no change: no save bar', async () => {
    ready(profile({ languages: [LANGS[0]!, LANGS[1]!, LANGS[2]!] }));
    render(<ProfilePanel userId="u1" />);
    await userEvent.click(screen.getByRole('button', { name: 'English' }));
    await userEvent.click(screen.getByRole('button', { name: 'English' }));
    expect(screen.queryByRole('region', { name: SAVE_COPY.barLabel })).toBeNull();
  });

  it('the common languages failed to load: says so, with Try again', async () => {
    commonFails = true;
    ready();
    render(<ProfilePanel userId="u1" />);
    expect(screen.getByText('We couldn’t load the language list.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(commonRetry).toHaveBeenCalled();
  });

  it('Save while an AI draft is being written says so, and saves nothing', async () => {
    ready();
    assist.mockReturnValue(new Promise(() => {}));
    render(<ProfilePanel userId="u1" />);
    await userEvent.click(screen.getByRole('button', { name: 'Igbo' }));
    await userEvent.click(screen.getByRole('button', { name: 'Write a draft' }));
    await userEvent.click(screen.getByRole('button', { name: SAVE_COPY.save }));
    expect(screen.getAllByText(SAVE_COPY.waitForDraft).length).toBeGreaterThan(0);
    expect(mutateAsync).not.toHaveBeenCalled();
  });
});
