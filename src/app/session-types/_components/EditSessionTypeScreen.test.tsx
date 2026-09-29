import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Viewer } from '@/types/mentor';
import { EditSessionTypeScreen } from './EditSessionTypeScreen';

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  usePathname: () => '/session-types/st1/edit',
}));

const mentor: Viewer = {
  kind: 'member',
  id: 'm1',
  firstName: 'Gbenga',
  initial: 'G',
  isMentee: false,
  isApprovedMentor: true,
  isMentor: true,
  completedSessions: 0,
  credits: null,
};
vi.mock('@/app/_shell/useAppShell', () => ({
  useAppShell: () => ({
    viewer: mentor,
    member: mentor,
    chrome: 'member',
    account: undefined,
    nav: 'mentor',
  }),
}));
vi.mock('@/lib/api/data/mentors', () => ({
  useTopics: () => ({
    topics: [
      { slug: 'document-preparation', label: 'Document preparation', id: 'o4' },
      { slug: 'school-selection', label: 'School selection', id: 'o1' },
    ],
    isLoading: false,
    error: null,
  }),
}));
vi.mock('@/lib/api/data/sessionTypes', async (orig) => ({
  autoIcon: (await orig<typeof import('@/lib/api/data/sessionTypes')>()).autoIcon,
  useCreateSessionType: () => ({ create: vi.fn(), isPending: false, error: null, reset: vi.fn() }),
  useRetryWindows: () => ({ retry: vi.fn(), isPending: false }),
  useMentorDefaults: () => ({
    data: {
      durationMin: 60,
      noticeHours: 24,
      windowDays: 28,
      breakMin: 15,
      requiresApproval: true,
    },
    isLoading: false,
    error: null,
    retry: vi.fn(),
  }),
  useSaveMentorDefaults: () => ({ save: vi.fn(), isPending: false, error: null, reset: vi.fn() }),
}));
vi.mock('@/lib/api/data/weeklyHours', async (orig) => ({
  ...(await orig<typeof import('@/lib/api/data/weeklyHours')>()),
  useWeeklyHours: () => ({ data: null, isLoading: true, error: null, retry: vi.fn() }),
  useSaveWeeklyHours: () => ({ save: vi.fn(), isPending: false, error: null, reset: vi.fn() }),
}));

let savedMock: unknown;
const save = vi.fn();
vi.mock('@/lib/api/data/sessionTypeEdit', async (orig) => ({
  toDraft: (await orig<typeof import('@/lib/api/data/sessionTypeEdit')>()).toDraft,
  useSavedSessionType: () => savedMock,
  useSaveSessionType: () => ({ save, isPending: false, error: null, reset: vi.fn() }),
}));

const SAVED = {
  read: {
    id: 'st1',
    name: 'SOP review',
    description: 'Line by line.',
    duration_minutes: 60,
    min_notice_minutes: 1440,
    duration_inherited: true,
    min_notice_inherited: true,
    meeting_venue: 'daily',
    is_active: true,
    service_offerings: [{ code: 'document-preparation', display_name: 'Document preparation' }],
    application_stages: ['drafting_stage'],
    custom_stage_label: null,
    icon: null,
    requires_booking_confirmation: null,
    booking_window_days: null,
    break_after_minutes: null,
  },
  questions: [
    { id: 'qa', text: 'Which programs?', kind: 'free_text', required: true, options: [] },
  ],
  windows: [],
};
const ready = (data = SAVED) => ({ data, isLoading: false, error: null, retry: vi.fn() });

beforeEach(() => {
  push.mockReset();
  save.mockReset().mockResolvedValue({
    failed: [],
    newIds: {},
    questionErrors: {},
    onlyRefusals: true,
    saved: { questions: [], windows: [] },
  });
  savedMock = ready();
});

describe('EditSessionTypeScreen', () => {
  it('opens on step 1 with the saved type, every step open, "Save changes"', () => {
    render(<EditSessionTypeScreen id="st1" />);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Edit session type' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Session name' })).toHaveValue('SOP review');
    // Every step reachable (the design's maxStep 4).
    expect(screen.getByRole('button', { name: /^Review/ })).toBeEnabled();
  });

  it('saves only through the save hook, then says "Changes saved"', async () => {
    const user = userEvent.setup();
    render(<EditSessionTypeScreen id="st1" />);
    const name = screen.getByRole('textbox', { name: 'Session name' });
    await user.clear(name);
    await user.type(name, 'SOP deep review');
    await user.click(screen.getByRole('button', { name: /^Review/ }));
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(save).toHaveBeenCalledTimes(1);
    const v = save.mock.calls[0]![0];
    expect(v).toMatchObject({ id: 'st1', savedQuestions: SAVED.questions });
    expect(v.draft.name).toBe('SOP deep review');
    expect(v.saved.name).toBe('SOP review');
    const dialog = await screen.findByRole('dialog', { name: 'Changes saved' });
    expect(dialog).toHaveTextContent('“SOP deep review” is live on your profile.');
    await user.click(within(dialog).getByRole('button', { name: 'Done' }));
    expect(push).toHaveBeenCalledWith('/session-types');
  });

  it('a partial save says what didn’t save, stays, and Save tries again', async () => {
    const user = userEvent.setup();
    save.mockResolvedValueOnce({
      failed: ['questions'],
      newIds: {},
      questionErrors: {},
      onlyRefusals: true,
      saved: { questions: SAVED.questions, windows: [] },
    });
    render(<EditSessionTypeScreen id="st1" />);
    await user.click(screen.getByRole('button', { name: /^Review/ }));
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(
      await screen.findByText(
        'Your changes are saved, except the intake questions. Save again to try those.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(save).toHaveBeenCalledTimes(2);
    expect(await screen.findByRole('dialog', { name: 'Changes saved' })).toBeInTheDocument();
  });

  it('a hidden type isn’t "live on your profile"', async () => {
    const user = userEvent.setup();
    savedMock = ready({ ...SAVED, read: { ...SAVED.read, is_active: false } });
    render(<EditSessionTypeScreen id="st1" />);
    await user.click(screen.getByRole('button', { name: /^Review/ }));
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    const dialog = await screen.findByRole('dialog', { name: 'Changes saved' });
    expect(dialog).toHaveTextContent(
      'It’s hidden, so mentees can’t book it until you switch it on.',
    );
    expect(within(dialog).queryByRole('link', { name: 'View on profile' })).toBeNull();
  });

  it('leaving with changes asks "Discard your changes?"', async () => {
    const user = userEvent.setup();
    render(<EditSessionTypeScreen id="st1" />);
    await user.type(screen.getByRole('textbox', { name: 'Session name' }), '!');
    await user.click(screen.getByRole('button', { name: 'Back to session types' }));
    expect(screen.getByRole('dialog', { name: 'Discard your changes?' })).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it('not found (not theirs, or deleted): says so, with the way back', () => {
    savedMock = {
      data: null,
      isLoading: false,
      error: { kind: 'notFound', message: 'x' },
      retry: vi.fn(),
    };
    render(<EditSessionTypeScreen id="gone" />);
    expect(
      screen.getByRole('heading', { name: 'This session type isn’t available' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to session types' })).toHaveAttribute(
      'href',
      '/session-types',
    );
  });

  it('a load error offers Try again; loading shows the skeleton', async () => {
    const user = userEvent.setup();
    const retry = vi.fn();
    savedMock = { data: null, isLoading: false, error: { kind: 'server', message: 'x' }, retry };
    const { unmount } = render(<EditSessionTypeScreen id="st1" />);
    expect(
      screen.getByRole('heading', { name: 'We couldn’t load this session type' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalled();
    unmount();
    savedMock = { data: null, isLoading: true, error: null, retry: vi.fn() };
    render(<EditSessionTypeScreen id="st1" />);
    expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument();
  });

  it('a retry after a partial save carries the new ids and what saved (review of #67)', async () => {
    const user = userEvent.setup();
    const savedAfter = {
      questions: [
        ...SAVED.questions,
        { id: 'qb', text: 'Deadline?', kind: 'free_text', required: false, options: [] },
      ],
      windows: [],
    };
    save
      .mockResolvedValueOnce({
        failed: ['hours'],
        newIds: { k1: 'qb' },
        questionErrors: {},
        onlyRefusals: true,
        saved: savedAfter,
      })
      .mockResolvedValueOnce({
        failed: [],
        newIds: {},
        questionErrors: {},
        onlyRefusals: true,
        saved: savedAfter,
      });
    render(<EditSessionTypeScreen id="st1" />);
    await user.click(screen.getByRole('button', { name: /^Review/ }));
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(
      await screen.findByText(
        'Your changes are saved, except the dedicated hours. Save again to try those.',
      ),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    const second = save.mock.calls[1]![0];
    expect(second.savedQuestions).toEqual(savedAfter.questions);
    expect(second.saved.name).toBe('SOP review');
  });

  it('an answered option the server wouldn’t change is said on that question', async () => {
    const user = userEvent.setup();
    save.mockResolvedValueOnce({
      failed: ['questions'],
      newIds: {},
      onlyRefusals: true,
      questionErrors: {
        qa: 'A booking already chose an option you removed or changed. Keep it, then save again.',
      },
      saved: { questions: SAVED.questions, windows: [] },
    });
    render(<EditSessionTypeScreen id="st1" />);
    await user.click(screen.getByRole('button', { name: /^Review/ }));
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(
      await screen.findByText('Your changes are saved, except the intake questions marked below.'),
    ).toBeInTheDocument();
    // Taken to the question.
    expect(screen.getByText('Step 2 of 4 · Intake questions')).toBeInTheDocument();
    expect(
      screen.getByText(
        'A booking already chose an option you removed or changed. Keep it, then save again.',
      ),
    ).toBeInTheDocument();
  });

  it('a refusal alongside another failed question still says "Save again" (review r3 of #67)', async () => {
    const user = userEvent.setup();
    save.mockResolvedValueOnce({
      failed: ['questions'],
      newIds: {},
      onlyRefusals: false,
      questionErrors: {
        qa: 'A booking already chose an option you removed or changed. Keep it, then save again.',
      },
      saved: { questions: SAVED.questions, windows: [] },
    });
    render(<EditSessionTypeScreen id="st1" />);
    await user.click(screen.getByRole('button', { name: /^Review/ }));
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(
      await screen.findByText(
        'Your changes are saved, except the intake questions. Save again to try those.',
      ),
    ).toBeInTheDocument();
  });
});
