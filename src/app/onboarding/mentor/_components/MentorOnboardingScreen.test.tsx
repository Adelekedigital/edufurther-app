import { StrictMode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { MentorApplicationState, MentorAnswers } from '@/types/mentorOnboarding';
import type { Viewer } from '@/types/mentor';
import { MentorOnboardingScreen } from './MentorOnboardingScreen';

const replace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

let viewer: Viewer;
vi.mock('@/lib/api/data/viewer', () => ({ useViewer: () => viewer }));

let dirty = false;
vi.mock('@/lib/utils/leaveGuard', () => ({
  useLeaveGuard: (d: boolean) => {
    dirty = d;
  },
}));

const countries = [
  { id: 'c-ng', label: 'Nigeria', code: 'NG' },
  { id: 'c-us', label: 'United States', code: 'US' },
];
vi.mock('@/lib/api/data/catalog', () => ({ useFieldsOfStudy: () => null }));
let topicsError: Error | null = null;
vi.mock('@/lib/api/data/mentors', () => ({
  useTopics: () => ({
    topics: topicsError
      ? []
      : [
          { id: 'o-docs', slug: 'document-preparation', label: 'Document preparation' },
          { id: 'o-school', slug: 'school-selection', label: 'School selection' },
        ],
    isLoading: false,
    error: topicsError,
    retry: vi.fn(),
  }),
}));
const avatar = { uploadedStamp: 0, uploadedUrl: null as string | null };
vi.mock('@/lib/api/data/avatar', () => ({
  useAvatarUpload: () => ({
    accept: 'image/jpeg,image/png',
    upload: vi.fn(),
    uploading: false,
    error: null,
    errorFrom: null,
    dismissError: vi.fn(),
    uploadedStamp: avatar.uploadedStamp,
    uploadedUrl: avatar.uploadedUrl,
    removedStamp: 0,
  }),
}));
const requestAssist = vi.fn();
vi.mock('@/lib/api/data/writingAssist', () => ({
  requestAssist: (...a: unknown[]) => requestAssist(...a),
}));

let appState: MentorApplicationState | null;
let institutions: {
  id: string;
  name: string;
  countryId: string | null;
  countryLabel: string | null;
}[] = [];
const save = vi.fn();
const submit = vi.fn();
let submitError: { kind: string; message: string } | null;
vi.mock('@/lib/api/data/mentorApplication', () => ({
  useMentorApplication: () => ({
    state: appState,
    countries,
    isLoading: !appState,
    error: null,
    retry: vi.fn(),
  }),
  useSaveMentorStep: () => ({ save, isPending: false, error: null, reset: vi.fn() }),
  useSubmitMentorApplication: () => ({
    submit,
    isPending: false,
    error: submitError,
    reset: vi.fn(),
  }),
  useInstitutionSearch: () => ({ options: institutions, isLoading: false }),
  DECIDED: '/problems/mentor-application-decided',
}));

const answers = (a: Partial<MentorAnswers> = {}): MentorAnswers => ({
  helpIds: [],
  schools: [
    {
      key: 's1',
      id: null,
      school: '',
      institutionId: null,
      catalogCountryId: null,
      countryId: '',
      countryOpen: false,
      degree: '',
      field: '',
      start: '',
      end: '',
      current: true,
    },
  ],
  photoUrl: null,
  originId: '',
  linkedin: '',
  about: '',
  aboutDrafted: false,
  aboutPromptVersion: null,
  days: [],
  from: 1080,
  to: 1260,
  timeZone: 'Africa/Lagos',
  timeZoneFallback: false,
  ...a,
});

const stateWith = (s: Partial<MentorApplicationState> = {}): MentorApplicationState => ({
  answers: answers(),
  lastStep: null,
  hasProfile: false,
  submitted: false,
  approvalStatus: null,
  approvedSeen: false,
  hasIntroChat: false,
  firstName: 'Gbenga',
  email: 'gbenga@example.com',
  handle: null,
  ...s,
});

beforeEach(() => {
  viewer = {
    kind: 'member',
    id: 'u1',
    firstName: 'Gbenga',
    initials: 'G',
    isMentee: false,
    isApprovedMentor: false,
    isMentor: false,
    completedSessions: 0,
    credits: null,
  };
  appState = stateWith();
  submitError = null;
  save.mockReset().mockResolvedValue(undefined);
  submit.mockReset().mockResolvedValue({ submittedAt: '2026-10-18T10:00:00Z' });
  requestAssist.mockReset().mockResolvedValue({ text: 'I studied…', promptVersion: 'v1' });
  replace.mockReset();
  institutions = [];
  avatar.uploadedStamp = 0;
  avatar.uploadedUrl = null;
  topicsError = null;
});

describe('MentorOnboardingScreen', () => {
  it('starts on help areas, and an empty Continue shows the error and focuses the first chip', async () => {
    render(<MentorOnboardingScreen />);
    expect(
      screen.getByRole('heading', { level: 1, name: 'What can you help mentees with?' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Step 1 of 4')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Pick at least 1 area you can help with.');
    expect(screen.getByText('Fill in the required fields to continue.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Document preparation' })).toHaveFocus();
    expect(save).not.toHaveBeenCalled();
  });

  it('saves a passing step and moves on; Back keeps the answers', async () => {
    render(<MentorOnboardingScreen />);
    await userEvent.click(screen.getByRole('button', { name: 'School selection' }));
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(save).toHaveBeenCalledWith(
      'help',
      expect.objectContaining({ helpIds: ['o-school'] }),
      appState,
      expect.any(Function),
    );
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Where did you study?' }),
    ).toHaveFocus();
    await userEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByRole('button', { name: 'School selection' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('a returning applicant opens on the next step with the welcome-back banner and the saved status', () => {
    appState = stateWith({
      lastStep: 'help',
      hasProfile: true,
      answers: answers({ helpIds: ['o-docs'] }),
    });
    render(<MentorOnboardingScreen />);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Where did you study?' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Welcome back. We kept your answers, so you can pick up here.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Progress saved')).toBeInTheDocument();
  });

  it('hours: presets pick days, a moved start keeps the range, and the summary follows', async () => {
    appState = stateWith({
      lastStep: 'about',
      hasProfile: true,
      answers: answers({ helpIds: ['o-docs'] }),
    });
    render(<MentorOnboardingScreen />);
    await userEvent.click(screen.getByRole('button', { name: 'Weekdays' }));
    expect(screen.getByRole('button', { name: 'Monday' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Saturday' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    await userEvent.selectOptions(screen.getByLabelText('From'), '1140');
    expect(screen.getByLabelText('To')).toHaveValue('1320');
    expect(screen.getByText('Mon, Tue, Wed, Thu, Fri · 7:00 pm – 10:00 pm')).toBeInTheDocument();
    expect(
      screen.getByText(
        'A free first chat about document preparation. We’ll talk through your goals and plan your next steps.',
      ),
    ).toBeInTheDocument();
  });

  it('submit: a failure keeps the answers and Submit tries again; success goes to the status page, in the app', async () => {
    appState = stateWith({
      lastStep: 'about',
      hasProfile: true,
      answers: answers({ helpIds: ['o-docs'], days: [0, 1] }),
    });
    submit.mockRejectedValueOnce(new Error('offline'));
    const { rerender } = render(<MentorOnboardingScreen />);
    await userEvent.click(screen.getByRole('button', { name: 'Submit application' }));
    expect(save).toHaveBeenCalledWith(
      'hours',
      expect.objectContaining({ days: [0, 1] }),
      appState,
      expect.any(Function),
    );
    submitError = { kind: 'offline', message: 'x' };
    rerender(<MentorOnboardingScreen />);
    expect(
      screen.getByText(
        'We couldn’t send your application. Your answers are saved. Check your connection and try again.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Monday' })).toHaveAttribute('aria-pressed', 'true');
    submitError = null;
    await userEvent.click(screen.getByRole('button', { name: 'Submit application' }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/mentor-application?sent=1'));
  });

  it('about: drafts an empty About on arrival; a failed draft says so and leaves the field editable', async () => {
    appState = stateWith({ lastStep: 'education', hasProfile: true });
    requestAssist.mockRejectedValueOnce(new Error('down'));
    render(<MentorOnboardingScreen />);
    // On screen and in the announcement: both copies.
    expect(screen.getAllByText('Drafting from your education and help areas…')).toHaveLength(2);
    expect(
      await screen.findAllByText(
        'We couldn’t draft your About right now. Write a few lines, or add it later in your profile.',
      ),
    ).toHaveLength(2);
    expect(screen.getByLabelText('About (optional)')).toBeEnabled();
  });

  it('about: the About takes 1,500 characters and the LinkedIn link has one name', async () => {
    appState = stateWith({ lastStep: 'education', hasProfile: true });
    requestAssist.mockRejectedValueOnce(new Error('down'));
    render(<MentorOnboardingScreen />);
    // Owner, 2026-10-17: About (about_me) is 1,500, not the prototype's 600.
    expect(await screen.findByLabelText('About (optional)')).toHaveAttribute('maxlength', '1500');
    expect(
      screen.getByRole('link', { name: 'Get your LinkedIn link (opens in a new tab)' }),
    ).toHaveAttribute('target', '_blank');
  });

  it('about: empty Continue flags the photo, origin and LinkedIn', async () => {
    appState = stateWith({
      lastStep: 'education',
      hasProfile: true,
      answers: answers({ about: 'Mine' }),
    });
    render(<MentorOnboardingScreen />);
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    const alerts = screen.getAllByRole('alert').map((a) => a.textContent);
    expect(alerts).toEqual(
      expect.arrayContaining([
        expect.stringContaining('Add a profile photo.'),
        expect.stringContaining('Select where you’re from.'),
        expect.stringContaining('Add your LinkedIn profile link.'),
      ]),
    );
  });

  it('an application in review stays on the status page: the reviewed answers are frozen', async () => {
    appState = stateWith({ approvalStatus: 'pending', submitted: true, lastStep: 'hours' });
    render(<MentorOnboardingScreen />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/mentor-application'));
    expect(
      screen.queryByRole('heading', { level: 1, name: 'What can you help mentees with?' }),
    ).toBeNull();
  });

  it('an unsubmitted applicant still resumes on the steps', () => {
    appState = stateWith({
      approvalStatus: 'pending',
      submitted: false,
      lastStep: 'help',
      hasProfile: true,
    });
    render(<MentorOnboardingScreen />);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Where did you study?' }),
    ).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it('a declined applicant goes to the status page', async () => {
    appState = stateWith({ approvalStatus: 'declined', submitted: true });
    render(<MentorOnboardingScreen />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/mentor-application'));
  });

  it('a school typed out in full links to the catalogue once the search answers', async () => {
    appState = stateWith({
      lastStep: 'help',
      hasProfile: true,
      answers: answers({ helpIds: ['o-docs'] }),
    });
    const { rerender } = render(<MentorOnboardingScreen />);
    await userEvent.type(screen.getByLabelText('University'), 'University of Lagos');
    expect(screen.queryByText('In Nigeria')).not.toBeInTheDocument();
    institutions = [
      { id: 'inst-1', name: 'University of Lagos', countryId: 'c-ng', countryLabel: 'Nigeria' },
    ];
    rerender(<MentorOnboardingScreen />);
    expect(await screen.findByText('In Nigeria')).toBeInTheDocument();
  });

  it('about: a new photo shows from the upload itself', () => {
    appState = stateWith({
      lastStep: 'education',
      hasProfile: true,
      answers: answers({ about: 'Mine' }),
    });
    const { rerender } = render(<MentorOnboardingScreen />);
    expect(screen.queryByRole('img', { name: /Gbenga/ })).not.toHaveAttribute('src');
    avatar.uploadedStamp = 1;
    avatar.uploadedUrl = '/photos/new.png';
    rerender(<MentorOnboardingScreen />);
    expect(screen.getByRole('img', { name: /Gbenga/ })).toHaveAttribute('src', '/photos/new.png');
  });

  it('about: the first draft lands under Strict Mode too (effects run twice on mount)', async () => {
    appState = stateWith({ lastStep: 'education', hasProfile: true });
    render(
      <StrictMode>
        <MentorOnboardingScreen />
      </StrictMode>,
    );
    expect(await screen.findByDisplayValue('I studied…')).toBeInTheDocument();
    expect(
      screen.queryByText('Drafting from your education and help areas…'),
    ).not.toBeInTheDocument();
  });

  it('keeps the education step on screen while the application refetches after step 1', async () => {
    const { rerender } = render(<MentorOnboardingScreen />);
    await userEvent.click(screen.getByRole('button', { name: 'School selection' }));
    // Step 1 made the profile: the refetch briefly has no state to give.
    save.mockImplementationOnce(async () => {
      appState = null;
    });
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    rerender(<MentorOnboardingScreen />);
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Where did you study?' }),
    ).toHaveFocus();
  });

  it('a school saved on Continue keeps its id, so Back then Continue edits it', async () => {
    appState = stateWith({
      lastStep: 'help',
      hasProfile: true,
      answers: answers({
        helpIds: ['o-docs'],
        about: 'Mine',
        schools: [
          {
            key: 's1',
            id: null,
            school: 'University of Lagos',
            institutionId: 'inst-1',
            catalogCountryId: 'c-ng',
            countryId: '',
            countryOpen: false,
            degree: 'bachelors',
            field: 'Microbiology',
            start: '2011',
            end: '2015',
            current: true,
          },
        ],
      }),
    });
    save.mockImplementation(
      async (
        step: string,
        _a: unknown,
        _s: unknown,
        onSchoolSaved?: (k: string, id: string) => void,
      ) => {
        if (step === 'education') onSchoolSaved?.('s1', 'e-new');
      },
    );
    render(<MentorOnboardingScreen />);
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await screen.findByRole('heading', { level: 1, name: 'About you' });
    expect(dirty).toBe(false);
    await userEvent.click(screen.getByRole('button', { name: 'Back' }));
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    const second = save.mock.calls.filter(([st]) => st === 'education')[1]![1] as MentorAnswers;
    expect(second.schools[0]!.id).toBe('e-new');
  });

  it('a short typed school with no catalogue match still gets the country picker', async () => {
    appState = stateWith({
      lastStep: 'help',
      hasProfile: true,
      answers: answers({ helpIds: ['o-docs'] }),
    });
    render(<MentorOnboardingScreen />);
    await userEvent.type(screen.getByLabelText('University'), 'UI');
    expect(screen.getByText('Country of study')).toBeInTheDocument();
  });

  it('an incomplete submit sends them to the step it names, with that field’s error', async () => {
    appState = stateWith({
      lastStep: 'about',
      hasProfile: true,
      answers: answers({ helpIds: ['o-docs'], days: [0], photoUrl: '/p.png', about: 'Mine' }),
    });
    submit.mockRejectedValueOnce(Object.assign(new Error('incomplete'), { missing: ['avatar'] }));
    render(<MentorOnboardingScreen />);
    await userEvent.click(screen.getByRole('button', { name: 'Submit application' }));
    expect(await screen.findByRole('heading', { level: 1, name: 'About you' })).toBeInTheDocument();
    expect(
      screen
        .getAllByRole('alert')
        .map((a) => a.textContent)
        .join(' '),
    ).toContain('Add a profile photo.');
  });

  it('a refused photo clears once a new photo is uploaded', async () => {
    appState = stateWith({
      lastStep: 'about',
      hasProfile: true,
      answers: answers({ helpIds: ['o-docs'], days: [0], photoUrl: '/p.png', about: 'Mine' }),
    });
    submit.mockRejectedValueOnce(Object.assign(new Error('incomplete'), { missing: ['avatar'] }));
    const { rerender } = render(<MentorOnboardingScreen />);
    await userEvent.click(screen.getByRole('button', { name: 'Submit application' }));
    expect(await screen.findByText('Add a profile photo.')).toBeInTheDocument();
    avatar.uploadedStamp = 1;
    avatar.uploadedUrl = '/photos/new.png';
    rerender(<MentorOnboardingScreen />);
    expect(screen.queryByText('Add a profile photo.')).not.toBeInTheDocument();
  });

  it('removing a blank school hands focus to "Add another school"', async () => {
    appState = stateWith({
      lastStep: 'help',
      hasProfile: true,
      answers: answers({ helpIds: ['o-docs'] }),
    });
    render(<MentorOnboardingScreen />);
    const add = screen.getByRole('button', { name: 'Add another school' });
    await userEvent.click(add);
    await userEvent.click(screen.getByRole('button', { name: 'Remove school 2' }));
    expect(add).toHaveFocus();
  });

  it('a failed help-areas list shows the load error, never an empty step 1', () => {
    topicsError = new Error('down');
    render(<MentorOnboardingScreen />);
    expect(screen.getByText('We couldn’t load your application')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'What can you help mentees with?' })).toBeNull();
  });

  it('the first draft is announced from a region that was already there, start and failure', async () => {
    appState = stateWith({ lastStep: 'education', hasProfile: true });
    let fail: (e: Error) => void = () => {};
    requestAssist.mockReturnValueOnce(new Promise((_, reject) => (fail = reject)));
    render(<MentorOnboardingScreen />);
    const regions = () =>
      screen.getAllByRole('status').filter((r) => r.className.includes('sr-only'));
    expect(regions().some((r) => r.textContent?.includes('Drafting from your education'))).toBe(
      true,
    );
    fail(new Error('down'));
    await waitFor(() =>
      expect(regions().some((r) => r.textContent?.includes('We couldn’t draft your About'))).toBe(
        true,
      ),
    );
  });

  it('a field the server refuses shows under that field, not as a general save error', async () => {
    appState = stateWith({
      lastStep: 'education',
      hasProfile: true,
      answers: answers({
        helpIds: ['o-docs'],
        photoUrl: '/p.png',
        originId: 'c-ng',
        linkedin: 'linkedin.com/in/ada-obi',
        about: 'Mine',
      }),
    });
    save.mockRejectedValueOnce(Object.assign(new Error('422'), { fields: ['linkedinFormat'] }));
    render(<MentorOnboardingScreen />);
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(
      await screen.findByText('Use your profile link, like linkedin.com/in/your-name.'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/We couldn’t save this step/)).not.toBeInTheDocument();
    expect(screen.getByLabelText('LinkedIn profile')).toHaveFocus();
    // Typing elsewhere doesn't hide it: only editing the link does.
    await userEvent.type(screen.getByLabelText('About (optional)'), ' more');
    expect(
      screen.getByText('Use your profile link, like linkedin.com/in/your-name.'),
    ).toBeInTheDocument();
  });

  it('Submit stays locked once it succeeds, while the status page loads', async () => {
    appState = stateWith({
      lastStep: 'about',
      hasProfile: true,
      answers: answers({ helpIds: ['o-docs'], days: [0] }),
    });
    render(<MentorOnboardingScreen />);
    const button = screen.getByRole('button', { name: 'Submit application' });
    await userEvent.click(button);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/mentor-application?sent=1'));
    expect(button).toHaveAttribute('aria-busy', 'true');
  });

  it('a decided application at submit goes to the status page, never "try again"', async () => {
    appState = stateWith({
      lastStep: 'about',
      hasProfile: true,
      answers: answers({ helpIds: ['o-docs'], days: [0] }),
    });
    submit.mockRejectedValueOnce(
      Object.assign(new Error('decided'), { type: '/problems/mentor-application-decided' }),
    );
    render(<MentorOnboardingScreen />);
    await userEvent.click(screen.getByRole('button', { name: 'Submit application' }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/mentor-application'));
  });

  it('an approved applicant sees the approved screen once, then the dashboard', async () => {
    viewer = {
      ...(viewer as Extract<Viewer, { kind: 'member' }>),
      isApprovedMentor: true,
      isMentor: true,
    };
    appState = stateWith({ approvalStatus: 'approved', submitted: true, approvedSeen: false });
    const { unmount } = render(<MentorOnboardingScreen />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/mentor-application'));
    unmount();
    replace.mockReset();
    appState = stateWith({ approvalStatus: 'approved', submitted: true, approvedSeen: true });
    render(<MentorOnboardingScreen />);
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/dashboard'));
  });

  it('a new photo isn’t an unsaved change: it’s already on the account', () => {
    appState = stateWith({
      lastStep: 'education',
      hasProfile: true,
      answers: answers({ about: 'Mine' }),
    });
    const { rerender } = render(<MentorOnboardingScreen />);
    avatar.uploadedStamp = 1;
    avatar.uploadedUrl = '/photos/new.png';
    rerender(<MentorOnboardingScreen />);
    expect(dirty).toBe(false);
  });

  it('Start over drafts the About again on the way back to step 3', async () => {
    appState = stateWith({
      lastStep: 'education',
      hasProfile: true,
      answers: answers({
        helpIds: ['o-docs'],
        schools: [
          {
            key: 's1',
            id: null,
            school: 'University of Lagos',
            institutionId: 'inst-1',
            catalogCountryId: 'c-ng',
            countryId: '',
            countryOpen: false,
            degree: 'bachelors',
            field: 'Microbiology',
            start: '2011',
            end: '2015',
            current: true,
          },
        ],
      }),
    });
    render(<MentorOnboardingScreen />);
    await screen.findByDisplayValue('I studied…');
    expect(requestAssist).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole('button', { name: 'Start over' }));
    await userEvent.click(screen.getByRole('button', { name: 'Document preparation' }));
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await screen.findByRole('heading', { level: 1, name: 'Where did you study?' });
    institutions = [
      { id: 'inst-1', name: 'University of Lagos', countryId: 'c-ng', countryLabel: 'Nigeria' },
    ];
    await userEvent.type(screen.getByLabelText('University'), 'University of Lagos');
    await userEvent.click(screen.getByRole('button', { name: 'Bachelor’s' }));
    await userEvent.type(screen.getByLabelText('Field of study'), 'Microbiology');
    await userEvent.selectOptions(screen.getByLabelText('Start year'), '2011');
    await userEvent.selectOptions(screen.getByLabelText('End year (or expected)'), '2015');
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    await screen.findByRole('heading', { level: 1, name: 'About you' });
    await waitFor(() => expect(requestAssist).toHaveBeenCalledTimes(2));
  });
});
