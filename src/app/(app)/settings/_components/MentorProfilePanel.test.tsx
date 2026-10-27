import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { MentorProfile } from '@/types/mentor';
import type { MentorProfileValues } from '@/types/mentorSettings';
import { MentorProfileSaveError } from '@/lib/api/data/mentorSettings';
import { MentorProfilePanel } from './MentorProfilePanel';
import { pickOption } from '@/test-utils/select';

const values: MentorProfileValues = {
  name: 'Ada Obi',
  headline: 'PhD Sociology · Mississippi State University',
  about: '',
  aboutDrafted: false,
  originId: 'ng',
  studyId: 'us',
  gender: '',
  languages: [{ id: 'en', label: 'English' }],
};

const profile = {
  mentor: {
    id: 'm1',
    name: 'Ada Obi',
    photoUrl: null,
    rating: 4.9,
    reviewCount: 7,
    completedSessions: 51,
    topics: [{ slug: 'school-selection', label: 'School selection' }],
  },
  cover: { color: null, art: 'icons' },
  bannerUrl: null,
} as unknown as MentorProfile;

let settings: {
  status: 'loading' | 'error' | 'ready';
  values: MentorProfileValues | null;
  profile: MentorProfile | null;
  handle: string | null;
  version: string;
  retry: () => void;
};
const mutateAsync = vi.fn();
let saveError: { copy: string; inReview?: boolean } | null = null;

vi.mock('@/lib/api/data/mentorSettings', async (orig) => ({
  ...(await orig<typeof import('@/lib/api/data/mentorSettings')>()),
  useMentorSettings: () => settings,
  useSaveMentorProfile: () => ({ mutateAsync, isPending: false, error: saveError, reset: vi.fn() }),
}));
vi.mock('@/lib/api/data/avatar', () => ({
  useAvatarUpload: () => ({
    accept: 'image/png',
    uploading: false,
    removing: false,
    error: null,
    errorFrom: null,
    removedStamp: 0,
    upload: vi.fn(),
    remove: vi.fn(),
    dismissError: vi.fn(),
  }),
}));
vi.mock('@/lib/api/data/cover', async (orig) => ({
  ...(await orig<typeof import('@/lib/api/data/cover')>()),
  useCoverEdit: () => ({
    pickColor: vi.fn(),
    save: vi.fn(),
    saveState: 'idle',
    savedStamp: 0,
    uploading: false,
    removeImage: vi.fn(),
    removing: false,
    removedStamp: 0,
    imageError: null,
    upload: vi.fn(),
    clearMessages: vi.fn(),
  }),
}));
vi.mock('@/lib/api/data/catalog', () => ({
  useCountries: () => ({
    countries: [
      { id: 'ng', label: 'Nigeria' },
      { id: 'us', label: 'United States' },
      { id: 'gh', label: 'Ghana' },
    ],
  }),
  useLanguageSearch: () => ({ results: [{ id: 'en', label: 'English' }], status: 'ready' }),
}));
vi.mock('@/lib/api/data/writingAssist', () => ({ useWritingAssist: () => ({ assist: vi.fn() }) }));
vi.mock('@/lib/api/data/settings', () => ({
  useMenteeProfile: () => ({ profile: { name: 'Ada Obi', email: 'ada@example.com' } }),
}));

beforeEach(() => {
  settings = { status: 'ready', values, profile, handle: 'ada-obi', version: 'v1', retry: vi.fn() };
  mutateAsync.mockReset();
  mutateAsync.mockResolvedValue(undefined);
  saveError = null;
});

const preview = () => within(screen.getByRole('complementary', { name: 'How mentees see you' }));
const bar = () => screen.queryByRole('region', { name: 'Unsaved changes' });
const banner = () =>
  screen.queryAllByText('We’re reviewing your application.')[0]?.closest('[class*="subtle"]');

describe('MentorProfilePanel', () => {
  it('the preview shows the saved profile, with Open profile to the public page', () => {
    render(<MentorProfilePanel userId="u1" />);
    expect(preview().getByText('Ada Obi')).toBeInTheDocument();
    expect(preview().getByText('From Nigeria, studied in the United States')).toBeInTheDocument();
    expect(preview().getByText('School selection')).toBeInTheDocument();
    expect(preview().getByRole('link', { name: 'Open profile' })).toHaveAttribute(
      'href',
      '/mentors/ada-obi',
    );
    expect(bar()).toBeNull();
  });

  it('the preview follows the form before it’s saved', async () => {
    const user = userEvent.setup();
    render(<MentorProfilePanel userId="u1" />);
    const headline = screen.getByRole('textbox', { name: 'Headline' });
    await user.clear(headline);
    await user.type(headline, 'MPH, Imperial College London');
    expect(preview().getByText('MPH, Imperial College London')).toBeInTheDocument();
    expect(bar()).toHaveTextContent('Unsaved changes to your profile');
  });

  it('Save with gaps: the form line, an error on each field, the first focused', async () => {
    const user = userEvent.setup();
    render(<MentorProfilePanel userId="u1" />);
    await user.clear(screen.getByRole('textbox', { name: 'Headline' }));
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(bar()).toHaveTextContent('Fill in the required fields to continue.');
    await waitFor(() => expect(screen.getByRole('textbox', { name: 'Headline' })).toHaveFocus());
    expect(screen.getByText('Add a headline.')).toBeInTheDocument();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('an unchanged older headline over 80 still saves with other changes', async () => {
    const user = userEvent.setup();
    const long = 'z'.repeat(100);
    settings = { ...settings, values: { ...values, headline: long } };
    render(<MentorProfilePanel userId="u1" />);
    await pickOption(user, screen.getByRole('combobox', { name: 'Gender (optional)' }), 'Woman');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        after: expect.objectContaining({ headline: long, gender: 'Woman' }),
      }),
    );
    expect(await screen.findByText('Profile saved')).toBeInTheDocument();
  });

  it('an edited headline still over 80 says to keep it to 80', async () => {
    const user = userEvent.setup();
    const long = 'z'.repeat(100);
    settings = { ...settings, values: { ...values, headline: long } };
    render(<MentorProfilePanel userId="u1" />);
    await user.type(screen.getByRole('textbox', { name: 'Headline' }), '{Backspace}');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(screen.getByText('Keep your headline to 80 characters.')).toBeInTheDocument();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('a failed save keeps the edit and says why, in our words', async () => {
    const user = userEvent.setup();
    saveError = { copy: 'Some changes saved, but your languages didn’t. Try again.' };
    mutateAsync.mockRejectedValue(new Error('x'));
    render(<MentorProfilePanel userId="u1" />);
    await pickOption(user, screen.getByRole('combobox', { name: 'Gender (optional)' }), 'Man');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(screen.getByRole('alert')).toHaveTextContent('your languages didn’t');
    expect(screen.getByRole('combobox', { name: 'Gender (optional)' })).toHaveValue('Man');
  });

  it('after Save the form keeps the saved values while the refetch is on its way', async () => {
    const user = userEvent.setup();
    render(<MentorProfilePanel userId="u1" />);
    await pickOption(user, screen.getByRole('combobox', { name: 'Gender (optional)' }), 'Woman');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Profile saved')).toBeInTheDocument();
    // useMentorSettings still returns the values from before the save.
    expect(screen.getByRole('combobox', { name: 'Gender (optional)' })).toHaveValue('Woman');
    expect(bar()).toBeNull();
  });

  it('after a partial failure, Save again sends only what didn’t land', async () => {
    const user = userEvent.setup();
    mutateAsync.mockRejectedValueOnce(
      new MentorProfileSaveError(
        'Some changes saved, but your headline and study country didn’t. Try again.',
        ['details'],
      ),
    );
    render(<MentorProfilePanel userId="u1" />);
    const name = screen.getByRole('textbox', { name: 'Full name' });
    await user.clear(name);
    await user.type(name, 'Ada  Eze');
    const headline = screen.getByRole('textbox', { name: 'Headline' });
    await user.clear(headline);
    await user.type(headline, 'MPH, Imperial');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(mutateAsync).toHaveBeenLastCalledWith(
      expect.objectContaining({
        // The name landed (and is the tidied one); the headline is still to send.
        before: expect.objectContaining({ name: 'Ada Eze', headline: values.headline }),
        after: expect.objectContaining({ name: 'Ada Eze', headline: 'MPH, Imperial' }),
      }),
    );
  });

  it('newer values that arrive while editing show once the edit is discarded', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<MentorProfilePanel userId="u1" />);
    await pickOption(user, screen.getByRole('combobox', { name: 'Gender (optional)' }), 'Man');
    settings = {
      ...settings,
      values: { ...values, headline: 'Edited on another device' },
      version: 'v2',
    };
    rerender(<MentorProfilePanel userId="u1" />);
    expect(screen.getByRole('combobox', { name: 'Gender (optional)' })).toHaveValue('Man');
    await user.click(screen.getByRole('button', { name: 'Discard' }));
    expect(screen.getByRole('textbox', { name: 'Headline' })).toHaveValue(
      'Edited on another device',
    );
  });

  it('a saved country missing from the catalog still shows in the preview by its saved name', () => {
    settings = {
      ...settings,
      values: { ...values, originId: 'old-id' },
      profile: {
        ...profile,
        originCountry: 'Zaire',
        studyCountry: 'United States',
      } as MentorProfile,
    };
    render(<MentorProfilePanel userId="u1" />);
    expect(preview().getByText('From Zaire, studied in the United States')).toBeInTheDocument();
  });

  it('…and the origin field shows that saved name too, not an empty box', () => {
    settings = {
      ...settings,
      values: { ...values, originId: 'old-id' },
      profile: {
        ...profile,
        originCountry: 'Zaire',
        studyCountry: 'United States',
      } as MentorProfile,
    };
    render(<MentorProfilePanel userId="u1" />);
    expect(screen.getByRole('combobox', { name: 'Country of origin' })).toHaveValue('Zaire');
  });

  it('…but the study picker doesn’t offer origin’s retired country', async () => {
    const user = userEvent.setup();
    settings = {
      ...settings,
      values: { ...values, originId: 'old-id' },
      profile: {
        ...profile,
        originCountry: 'Zaire',
        studyCountry: 'United States',
      } as MentorProfile,
    };
    render(<MentorProfilePanel userId="u1" />);
    const study = screen.getByRole('combobox', { name: 'Country you studied in' });
    await user.clear(study);
    await user.type(study, 'Zai');
    expect(screen.queryByRole('option', { name: 'Zaire' })).toBeNull();
  });

  it('after Save, a newer read is taken even if it equals what was there before', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<MentorProfilePanel userId="u1" />);
    await pickOption(user, screen.getByRole('combobox', { name: 'Gender (optional)' }), 'Woman');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    await screen.findByText('Profile saved');
    // Another device put the old value back: a new read, with the old values.
    settings = { ...settings, version: 'v2' };
    rerender(<MentorProfilePanel userId="u1" />);
    expect(screen.getByRole('combobox', { name: 'Gender (optional)' })).toHaveValue('');
  });

  it('error before content: a failed load offers Try again', async () => {
    settings = { ...settings, status: 'error', values: null, profile: null };
    render(<MentorProfilePanel userId="u1" />);
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(settings.retry).toHaveBeenCalled();
  });

  it('loading: the skeleton, announced', () => {
    settings = { ...settings, status: 'loading', values: null, profile: null };
    render(<MentorProfilePanel userId="u1" />);
    expect(screen.getByRole('status', { name: 'Loading your profile' })).toBeInTheDocument();
  });

  describe('while the application is in review', () => {
    it('the banner; what’s reviewed is read-only, name and gender stay live', () => {
      render(<MentorProfilePanel userId="u1" frozen />);
      expect(banner()).toHaveTextContent(
        'We’re reviewing your application. You can edit your name and gender now, and the rest once it’s reviewed. Spotted a mistake? Contact us',
      );
      expect(screen.getByRole('textbox', { name: 'Headline' })).toBeDisabled();
      expect(screen.getByRole('textbox', { name: 'Full name' })).toBeEnabled();
      expect(screen.getByRole('combobox', { name: 'Gender (optional)' })).toBeEnabled();
      expect(screen.queryByRole('button', { name: 'Change cover' })).toBeNull();
      expect(screen.queryByRole('button', { name: /photo/i })).toBeNull();
    });

    it('Tab goes from Full name straight to Gender', async () => {
      const user = userEvent.setup();
      render(<MentorProfilePanel userId="u1" frozen />);
      screen.getByRole('textbox', { name: 'Full name' }).focus();
      await user.tab();
      expect(screen.getByRole('combobox', { name: 'Gender (optional)' })).toHaveFocus();
    });

    it('a name change saves with the save bar, even with a reviewed field empty', async () => {
      const user = userEvent.setup();
      settings = { ...settings, values: { ...values, originId: '' } };
      render(<MentorProfilePanel userId="u1" frozen />);
      const name = screen.getByRole('textbox', { name: 'Full name' });
      await user.clear(name);
      await user.type(name, 'Ada Obi-Eze');
      await user.click(screen.getByRole('button', { name: 'Save changes' }));
      expect(mutateAsync).toHaveBeenCalledTimes(1);
      const { before, after } = mutateAsync.mock.calls[0]![0];
      expect(after).toEqual({ ...before, name: 'Ada Obi-Eze' });
    });

    it('a save the freeze refuses shows the banner, not an error', () => {
      saveError = { copy: 'We couldn’t save your profile.', inReview: true };
      render(<MentorProfilePanel userId="u1" />);
      expect(banner()).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: 'Headline' })).toBeDisabled();
    });
  });

  it('languages are optional: none saves, and the label says so (founder, 21 Oct)', async () => {
    const user = userEvent.setup();
    render(<MentorProfilePanel userId="u1" />);
    expect(screen.getAllByText('Languages you mentor in (optional)').length).toBeGreaterThan(0);
    await user.click(screen.getByRole('button', { name: /Remove English|English/ }));
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(screen.queryByText('Fill in the required fields to continue.')).toBeNull();
    expect(mutateAsync).toHaveBeenCalled();
  });
});
