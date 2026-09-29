import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Viewer } from '@/types/mentor';
import { CreateSessionTypeScreen } from './CreateSessionTypeScreen';

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  usePathname: () => '/session-types/new',
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

const create = vi.fn();
let defaultsMock: unknown;
const READY = {
  data: { durationMin: 60, noticeHours: 48, windowDays: 28, breakMin: 15, requiresApproval: true },
  isLoading: false,
  error: null,
  retry: vi.fn(),
};
let createError: unknown = null;
vi.mock('@/lib/api/data/sessionTypes', async (orig) => ({
  autoIcon: (await orig<typeof import('@/lib/api/data/sessionTypes')>()).autoIcon,
  useCreateSessionType: () => ({ create, isPending: false, error: createError, reset: vi.fn() }),
  useRetryWindows: () => ({ retry: vi.fn(), isPending: false }),
  useMentorDefaults: () => defaultsMock,
  useSaveMentorDefaults: () => ({
    save: saveDefaults,
    isPending: false,
    error: defaultsSaveError,
    reset: resetDefaults,
  }),
}));
const saveDefaults = vi.fn();
const resetDefaults = vi.fn();
let defaultsSaveError: unknown = null;
const saveHours = vi.fn();
let otherSlots: { day: number; slot: [number, number]; zone: string }[] = [];
const WEEK = [
  { on: false, slots: [[540, 600]] },
  { on: true, slots: [[1020, 1200]] },
  { on: false, slots: [[540, 600]] },
  { on: false, slots: [[540, 600]] },
  { on: false, slots: [[540, 600]] },
  { on: false, slots: [[540, 600]] },
  { on: true, slots: [[540, 780]] },
];
vi.mock('@/lib/api/data/weeklyHours', () => ({
  useWeeklyHours: () => ({
    data: {
      days: WEEK,
      timeZone: 'Africa/Lagos',
      rules: [],
      otherZones: otherSlots.length ? ['Europe/London'] : [],
      otherSlots,
    },
    isLoading: false,
    error: null,
    retry: vi.fn(),
  }),
  useSaveWeeklyHours: () => ({ save: saveHours, isPending: false, error: null, reset: vi.fn() }),
}));

beforeEach(() => {
  push.mockReset();
  create.mockReset();
  createError = null;
  defaultsMock = READY;
  saveDefaults.mockReset().mockResolvedValue(undefined);
  resetDefaults.mockReset();
  defaultsSaveError = null;
  saveHours.mockReset().mockResolvedValue(undefined);
  otherSlots = [];
});
const next = (name: RegExp) => screen.getByRole('button', { name });

describe('CreateSessionTypeScreen', () => {
  it('a template pre-fills step 1; later steps are locked until reached', () => {
    render(<CreateSessionTypeScreen template="sop-review" />);
    expect(screen.getByRole('textbox', { name: 'Session name' })).toHaveValue('SOP draft review');
    expect(
      within(screen.getByRole('group', { name: 'Topics' })).getByRole('button', {
        name: 'Document preparation',
      }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /^Review/ })).toBeDisabled();
  });

  it('Continue checks the step: errors on the fields, and it stays', async () => {
    const user = userEvent.setup();
    render(<CreateSessionTypeScreen template={null} />);
    await user.click(next(/Continue to intake questions/));
    expect(screen.getByText('Give your session a name.')).toBeInTheDocument();
    expect(screen.getByText('Pick at least one topic.')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: 'Session name' })).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(screen.getByText('Step 1 of 4 · Core details')).toBeInTheDocument();
  });

  it('leaving step 1 with changes asks first; without changes it just goes', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<CreateSessionTypeScreen template={null} />);
    await user.click(screen.getByRole('button', { name: 'Back to session types' }));
    expect(push).toHaveBeenCalledWith('/session-types');
    unmount();
    push.mockReset();
    render(<CreateSessionTypeScreen template={null} />);
    await user.type(screen.getByRole('textbox', { name: 'Session name' }), 'Mock');
    await user.click(screen.getByRole('button', { name: 'Back to session types' }));
    expect(push).not.toHaveBeenCalled();
    const dialog = screen.getByRole('dialog', { name: 'Discard this session type?' });
    await user.click(within(dialog).getByRole('button', { name: 'Keep editing' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('publishing sends the questions with the type, once, and opens the published modal', async () => {
    const user = userEvent.setup();
    create.mockImplementation((_v, opts) => opts.onSuccess({ id: 'new', failedWindows: [] }));
    render(<CreateSessionTypeScreen template="sop-review" />);
    await user.click(next(/Continue to intake questions/));
    await user.click(next(/Continue to scheduling/));
    await user.click(next(/Continue to review/));
    await user.click(next(/Publish session/));
    expect(create).toHaveBeenCalledTimes(1);
    const { body, windows } = create.mock.calls[0]![0];
    expect(body).toMatchObject({ name: 'SOP draft review', service_offering_ids: ['o4'] });
    expect(body.questions).toHaveLength(2);
    expect(windows).toEqual([]);
    expect(screen.getByRole('dialog', { name: 'Session type published' })).toBeInTheDocument();
  });

  it('a name the server refuses sends the mentor back to step 1, on the field', async () => {
    const user = userEvent.setup();
    create.mockImplementation((_v, opts) =>
      opts.onError({
        kind: 'conflict',
        message: 'Some details need another look.',
        fields: { name: 'You already have a session type with this name.' },
      }),
    );
    render(<CreateSessionTypeScreen template="sop-review" />);
    for (const n of [
      /Continue to intake/,
      /Continue to scheduling/,
      /Continue to review/,
      /Publish session/,
    ])
      await user.click(next(n));
    expect(screen.getByText('Step 1 of 4 · Core details')).toBeInTheDocument();
    expect(screen.getByText('You already have a session type with this name.')).toBeInTheDocument();
  });

  it('delete a question confirms first', async () => {
    const user = userEvent.setup();
    render(<CreateSessionTypeScreen template="sop-review" />);
    await user.click(next(/Continue to intake questions/));
    await user.click(screen.getByRole('button', { name: 'Delete question 1' }));
    const dialog = screen.getByRole('dialog', { name: 'Delete this question?' });
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));
    expect(
      screen
        .getAllByRole('listitem')
        .filter((li) => li.closest('ol[aria-label="Intake questions"]')),
    ).toHaveLength(1);
  });

  it('editing a question, then deleting one above it, saves the right question (review of #49)', async () => {
    const user = userEvent.setup();
    render(<CreateSessionTypeScreen template="sop-review" />);
    await user.click(next(/Continue to intake questions/));
    await user.click(screen.getByRole('button', { name: 'Edit question 2' }));
    await user.click(screen.getByRole('button', { name: 'Delete question 1' }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));
    const text = screen.getByRole('textbox', { name: 'Question' });
    await user.clear(text);
    await user.type(text, 'Upload your latest draft');
    await user.click(screen.getByRole('button', { name: 'Save question' }));
    const rows = within(screen.getByRole('list', { name: 'Intake questions' })).getAllByRole(
      'listitem',
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveTextContent('Upload your latest draft');
  });

  it('a server error on one question shows on that question; a rules error clears when fixed', async () => {
    const user = userEvent.setup();
    create.mockImplementationOnce((_v, opts) =>
      opts.onError({
        kind: 'validation',
        message: 'x',
        fields: { 'question-1': 'Check this question and its options.' },
      }),
    );
    render(<CreateSessionTypeScreen template="sop-review" />);
    for (const n of [
      /Continue to intake/,
      /Continue to scheduling/,
      /Continue to review/,
      /Publish session/,
    ])
      await user.click(next(n));
    expect(screen.getByText('Step 2 of 4 · Intake questions')).toBeInTheDocument();
    const rows = within(screen.getByRole('list', { name: 'Intake questions' })).getAllByRole(
      'listitem',
    );
    expect(rows[1]).toHaveTextContent('Check this question and its options.');
    expect(rows[0]).not.toHaveTextContent('Check this question');

    create.mockImplementationOnce((_v, opts) =>
      opts.onError({
        kind: 'validation',
        message: 'x',
        fields: { rules: 'Check the length and booking rules.' },
      }),
    );
    for (const n of [/Continue to scheduling/, /Continue to review/, /Publish session/])
      await user.click(next(n));
    // Shown with "Use my defaults" too (the server can refuse inherited rules).
    expect(screen.getByText('Check the length and booking rules.')).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: /Set rules for this session/ }));
    expect(screen.queryByText('Check the length and booking rules.')).toBeNull();
  });

  it('never shows platform values as "my default" while the mentor’s are loading or failed', async () => {
    const user = userEvent.setup();
    defaultsMock = { data: null, isLoading: true, error: null, retry: vi.fn() };
    const { unmount } = render(<CreateSessionTypeScreen template="sop-review" />);
    await user.click(next(/Continue to intake/));
    await user.click(next(/Continue to scheduling/));
    expect(screen.getByText('Loading your defaults…')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit defaults' })).toBeDisabled();
    await user.click(next(/Continue to review/));
    expect(screen.queryByText(/confirm instantly/i)).toBeNull();
    unmount();
    const retry = vi.fn();
    defaultsMock = { data: null, isLoading: false, error: { kind: 'server', message: 'x' }, retry };
    render(<CreateSessionTypeScreen template="sop-review" />);
    await user.click(next(/Continue to intake/));
    await user.click(next(/Continue to scheduling/));
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalled();
  });

  it('"Use my defaults" sends nothing of its own; custom rules send all five', async () => {
    const user = userEvent.setup();
    const toStep3 = async () => {
      await user.click(next(/Continue to intake/));
      await user.click(next(/Continue to scheduling/));
    };
    const publish = async () => {
      await user.click(next(/Continue to review/));
      await user.click(next(/Publish session/));
    };
    const { unmount } = render(<CreateSessionTypeScreen template="sop-review" />);
    await toStep3();
    expect(
      screen.getByText(
        '60 min sessions · at least 48 hours notice · bookable up to 4 weeks ahead · 15 min break · you approve each request',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: 'Session length' })).toBeNull();
    await publish();
    expect(create.mock.calls[0]![0].body).toMatchObject({
      duration_minutes: null,
      min_notice_minutes: null,
      booking_window_days: null,
      break_after_minutes: null,
      requires_booking_confirmation: null,
    });
    unmount();

    create.mockReset();
    render(<CreateSessionTypeScreen template="sop-review" />);
    await toStep3();
    await user.click(screen.getByRole('radio', { name: /Set rules for this session/ }));
    await user.selectOptions(screen.getByRole('combobox', { name: 'Session length' }), '90');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Minimum notice' }), '72');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Booking approval' }), 'off');
    await publish();
    expect(create.mock.calls[0]![0].body).toMatchObject({
      duration_minutes: 90,
      min_notice_minutes: 4320,
      requires_booking_confirmation: false,
    });
  });

  it('Edit defaults opens Booking preferences; Save sends every value, Cancel nothing', async () => {
    const user = userEvent.setup();
    render(<CreateSessionTypeScreen template="sop-review" />);
    await user.click(next(/Continue to intake/));
    await user.click(next(/Continue to scheduling/));
    await user.click(screen.getByRole('button', { name: 'Edit defaults' }));
    let dialog = screen.getByRole('dialog', { name: 'Booking preferences' });
    // The mentor's own values, not the platform's.
    expect(within(dialog).getByRole('combobox', { name: 'Session length' })).toHaveValue('60');
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(saveDefaults).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Edit defaults' }));
    dialog = screen.getByRole('dialog', { name: 'Booking preferences' });
    // No 6-hour notice: the platform minimum is 24 hours (backend round 3).
    expect(
      within(within(dialog).getByRole('combobox', { name: 'Minimum notice' })).queryByRole(
        'option',
        { name: '6 hrs' },
      ),
    ).toBeNull();
    await user.selectOptions(
      within(dialog).getByRole('combobox', { name: 'Session length' }),
      '30',
    );
    await user.selectOptions(
      within(dialog).getByRole('combobox', { name: 'Approve bookings before they’re confirmed' }),
      'off',
    );
    await user.click(within(dialog).getByRole('button', { name: 'Save defaults' }));
    expect(saveDefaults).toHaveBeenCalledWith({
      durationMin: 30,
      noticeHours: 48,
      windowDays: 28,
      breakMin: 15,
      requiresApproval: false,
    });
    await vi.waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('Edit weekly hours shows the Calendar hours and saves them; bad hours block the save', async () => {
    const user = userEvent.setup();
    render(<CreateSessionTypeScreen template="sop-review" />);
    await user.click(next(/Continue to intake/));
    await user.click(next(/Continue to scheduling/));
    // The zone is named with the times (product rule).
    expect(
      screen.getByText('Mon 5 pm–8 pm · Sat 9 am–1 pm · Lagos (WAT) time'),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Edit weekly hours' }));
    const dialog = screen.getByRole('dialog', { name: 'Your weekly hours' });
    // 4:00 pm, before the 5:00 pm start.
    await user.selectOptions(
      within(dialog).getByRole('combobox', { name: 'Monday end time' }),
      '960',
    );
    expect(within(dialog).getByText('Ends before it starts')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Save hours' }));
    expect(saveHours).not.toHaveBeenCalled();
    expect(within(dialog).getByRole('alert')).toHaveTextContent(
      'Fix the hours marked in red, then save.',
    );
    await user.selectOptions(
      within(dialog).getByRole('combobox', { name: 'Monday end time' }),
      '1260',
    );
    await user.click(within(dialog).getByRole('button', { name: 'Save hours' }));
    expect(saveHours).toHaveBeenCalledTimes(1);
    expect(saveHours.mock.calls[0]![0].days[1]).toEqual({ on: true, slots: [[1020, 1260]] });
  });
});

describe('CreateSessionTypeScreen — review of #60', () => {
  const toStep3 = async (user: ReturnType<typeof userEvent.setup>, template = 'sop-review') => {
    render(<CreateSessionTypeScreen template={template} />);
    await user.click(next(/Continue to intake/));
    await user.click(next(/Continue to scheduling/));
  };

  it('a failed save keeps Booking preferences open and says so; reopening starts clean', async () => {
    const user = userEvent.setup();
    saveDefaults.mockRejectedValue({ kind: 'server', message: 'x' });
    defaultsSaveError = {
      kind: 'server',
      message: 'Your preferences didn’t save. Try again in a moment.',
    };
    await toStep3(user);
    await user.click(screen.getByRole('button', { name: 'Edit defaults' }));
    expect(resetDefaults).toHaveBeenCalledTimes(1);
    const dialog = screen.getByRole('dialog', { name: 'Booking preferences' });
    await user.click(within(dialog).getByRole('button', { name: 'Save defaults' }));
    expect(screen.getByRole('dialog', { name: 'Booking preferences' })).toBeInTheDocument();
    expect(within(dialog).getByRole('alert')).toHaveTextContent('Your preferences didn’t save.');
  });

  it('"Set rules for this session" starts from the mentor’s own values', async () => {
    const user = userEvent.setup();
    await toStep3(user);
    await user.click(screen.getByRole('radio', { name: /Set rules for this session/ }));
    // READY: 60 min, 48 hrs, 28 days, 15 min — not the blank draft's 24 hrs notice.
    expect(screen.getByRole('combobox', { name: 'Session length' })).toHaveValue('60');
    expect(screen.getByRole('combobox', { name: 'Minimum notice' })).toHaveValue('48');
  });

  it('a template whose length isn’t the mentor’s starts with its own rules; one that is, follows the defaults', async () => {
    const user = userEvent.setup();
    // Mock visa interview is 45 min; the mentor's default is 60.
    await toStep3(user, 'mock-visa-interview');
    expect(screen.getByRole('combobox', { name: 'Session length' })).toHaveValue('45');
    expect(screen.getByRole('combobox', { name: 'Minimum notice' })).toHaveValue('48');
  });

  it('a stored value that isn’t a design option shows as itself, not the first option', async () => {
    const user = userEvent.setup();
    defaultsMock = { ...READY, data: { ...READY.data, windowDays: 20 } };
    await toStep3(user);
    await user.click(screen.getByRole('button', { name: 'Edit defaults' }));
    const dialog = screen.getByRole('dialog', { name: 'Booking preferences' });
    const select = within(dialog).getByRole('combobox', { name: 'Bookable up to' });
    expect(select).toHaveValue('20');
    expect(within(select).getByRole('option', { name: '20 days' })).toBeInTheDocument();
  });

  it('defaults that arrive late don’t swallow what the mentor typed (review r2 of #60)', async () => {
    const user = userEvent.setup();
    defaultsMock = { data: null, isLoading: true, error: null, retry: vi.fn() };
    const { rerender } = render(<CreateSessionTypeScreen template="mock-visa-interview" />);
    await user.type(screen.getByRole('textbox', { name: 'Session name' }), ' 2');
    // The defaults fail: the platform's 60 min isn't the template's 45, so its rules become its own.
    defaultsMock = {
      data: null,
      isLoading: false,
      error: { kind: 'server', message: 'x' },
      retry: vi.fn(),
    };
    rerender(<CreateSessionTypeScreen template="mock-visa-interview" />);
    await user.click(screen.getByRole('button', { name: 'Back to session types' }));
    // Still an unsaved change: it asks before leaving.
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Discard this session type?' })).toBeInTheDocument();
  });

  it('new hours overlapping hours kept in another zone can’t be saved, and it says which zone', async () => {
    const user = userEvent.setup();
    otherSlots = [{ day: 1, slot: [1080, 1140], zone: 'Europe/London' }]; // Mon 6–7 pm, London
    await toStep3(user);
    await user.click(screen.getByRole('button', { name: 'Edit weekly hours' }));
    const dialog = screen.getByRole('dialog', { name: 'Your weekly hours' });
    expect(
      within(dialog).getByText(/Hours you set in London \(UK\) aren’t shown here/),
    ).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Save hours' }));
    expect(saveHours).not.toHaveBeenCalled();
    expect(within(dialog).getByRole('alert')).toHaveTextContent(
      'Some of these hours overlap hours you set in London (UK). Change them, then save.',
    );
  });
});
