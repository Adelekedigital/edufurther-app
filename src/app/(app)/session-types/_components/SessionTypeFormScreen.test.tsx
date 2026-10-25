import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Viewer } from '@/types/mentor';
import { SessionTypeFormScreen } from './SessionTypeFormScreen';
import { expectLockedPage, explainer, resetFlags, viewers } from '@/app/_shell/lockedPage.harness';

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  usePathname: () => '/session-types/new',
}));

const mentor: Viewer = {
  kind: 'member',
  id: 'm1',
  firstName: 'Gbenga',
  initials: 'G',
  isMentee: false,
  isApprovedMentor: true,
  isMentor: true,
  completedSessions: 0,
  credits: null,
};
let viewer: Viewer = mentor;
// The setup lock's flags, switchable per test (lockedPage.harness).
vi.mock('@/lib/config/auth', async (orig) =>
  (await import('@/app/_shell/lockedPage.harness')).authFlags(await orig()),
);
vi.mock('@/app/_shell/useAppShell', async () => {
  const { accessFor } = await import('@/lib/utils/access');
  return {
    useAppShell: () => ({
      access: accessFor(viewer),
      viewer,
      member: viewer.kind === 'member' ? viewer : null,
      chrome: 'member',
      account: undefined,
      nav: 'mentor',
    }),
  };
});
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
// The mentor's sessions, for the limit check when the form opens.
let ownCount = 0;
vi.mock('@/lib/api/data/sessionTypes', async (orig) => ({
  useOwnSessionTypes: () => ({
    data: Array.from({ length: ownCount }, (_, i) => ({ id: `t${i}` })),
    isLoading: false,
    error: null,
  }),
  autoIcon: (await orig<typeof import('@/lib/api/data/sessionTypes')>()).autoIcon,
  useCreateSessionType: () => ({ create, isPending: false, error: createError, reset: vi.fn() }),
  useRetryWindows: () => ({ retry: vi.fn(), isPending: false }),
  useMentorDefaults: () => defaultsMock,
}));
const WEEK = [
  { on: false, slots: [[540, 600]] },
  { on: true, slots: [[1020, 1200]] },
  { on: false, slots: [[540, 600]] },
  { on: false, slots: [[540, 600]] },
  { on: false, slots: [[540, 600]] },
  { on: false, slots: [[540, 600]] },
  { on: true, slots: [[540, 780]] },
];
vi.mock('@/lib/api/data/weeklyHours', async (orig) => ({
  ...(await orig<typeof import('@/lib/api/data/weeklyHours')>()),
  useWeeklyHours: () => ({
    data: {
      days: WEEK,
      timeZone: 'Africa/Lagos',
      rules: [],
      otherZones: [],
      otherSlots: [],
    },
    isLoading: false,
    error: null,
    retry: vi.fn(),
  }),
}));

vi.mock('@/lib/api/data/sessionTypeEdit', () => ({
  useSaveSessionType: () => ({ save: vi.fn(), isPending: false, error: null, reset: vi.fn() }),
}));

beforeEach(() => {
  push.mockReset();
  viewer = mentor;
  ownCount = 0;
  resetFlags();
  create.mockReset();
  createError = null;
  defaultsMock = READY;
});
const next = (name: RegExp) => screen.getByRole('button', { name });

describe('SessionTypeFormScreen', () => {
  it('a template pre-fills step 1; later steps are locked until reached', () => {
    render(<SessionTypeFormScreen template="sop-review" />);
    expect(screen.getByRole('textbox', { name: 'Session name' })).toHaveValue('SOP draft review');
    expect(
      within(screen.getByRole('group', { name: 'What does this session help with?' })).getByRole(
        'button',
        {
          name: 'Document preparation',
        },
      ),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: /^Review/ })).toBeDisabled();
  });

  it('Continue checks the step: errors on the fields, and it stays', async () => {
    const user = userEvent.setup({ delay: null });
    render(<SessionTypeFormScreen template={null} />);
    await user.click(next(/^Continue$/));
    expect(screen.getByText('Give your session a name.')).toBeInTheDocument();
    // The shared FieldError line: announced, and describing the topic chips.
    expect(screen.getByText('Pick at least one topic.').closest('p')).toHaveAttribute(
      'role',
      'alert',
    );
    expect(
      screen.getByRole('group', { name: 'What does this session help with?' }),
    ).toHaveAccessibleDescription(/Pick at least one topic/);
    expect(screen.getByRole('textbox', { name: 'Session name' })).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(screen.getByText('Step 1 of 4 · Define your session')).toBeInTheDocument();
  });

  it('Continue with gaps: the form message, said once per try, and focus on the first gap', async () => {
    const user = userEvent.setup({ delay: null });
    render(<SessionTypeFormScreen template={null} />);
    const status = () => screen.getAllByRole('status').find((x) => x.className === 'sr-only')!;
    // Mounted empty, so a screen reader hears the words when they arrive.
    expect(status()).toBeEmptyDOMElement();
    await user.click(next(/^Continue$/));
    expect(screen.getAllByText('Fill in the required fields to continue.')).toHaveLength(2);
    expect(status()).toHaveTextContent('Fill in the required fields to continue.');
    expect(screen.getByRole('textbox', { name: 'Session name' })).toHaveFocus();
    // Name filled: the next gap, the description, takes focus on the next try.
    await user.type(screen.getByRole('textbox', { name: 'Session name' }), 'Essay review');
    await user.click(next(/^Continue$/));
    expect(screen.getByRole('textbox', { name: 'What mentees get' })).toHaveFocus();
    await user.type(screen.getByRole('textbox', { name: 'What mentees get' }), 'Notes.');
    await user.click(next(/^Continue$/));
    expect(
      within(screen.getByRole('group', { name: 'What does this session help with?' })).getByRole(
        'button',
        { name: 'Document preparation' },
      ),
    ).toHaveFocus();
    // The last gap filled: the message goes.
    await user.click(screen.getByRole('button', { name: 'Document preparation' }));
    expect(screen.queryByText('Fill in the required fields to continue.')).toBeNull();
  });

  it('step 1 says the price: Free, for now', () => {
    render(<SessionTypeFormScreen template="sop-review" />);
    expect(screen.getByText('Price')).toBeInTheDocument();
    expect(screen.getByText('All sessions are free for now.')).toBeInTheDocument();
    expect(
      screen.getByText('Pick up to 3 of your help areas. Mentees filter by these on Explore.'),
    ).toBeInTheDocument();
  });

  it('leaving step 1 with changes asks first; without changes it just goes', async () => {
    const user = userEvent.setup({ delay: null });
    const { unmount } = render(<SessionTypeFormScreen template={null} />);
    await user.click(screen.getByRole('button', { name: 'Back to sessions' }));
    expect(push).toHaveBeenCalledWith('/session-types');
    unmount();
    push.mockReset();
    render(<SessionTypeFormScreen template={null} />);
    await user.type(screen.getByRole('textbox', { name: 'Session name' }), 'Mock');
    await user.click(screen.getByRole('button', { name: 'Back to sessions' }));
    expect(push).not.toHaveBeenCalled();
    const dialog = screen.getByRole('alertdialog', { name: 'Discard this session?' });
    await user.click(within(dialog).getByRole('button', { name: 'Keep editing' }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('publishing sends the questions with the type, once, and opens the published modal', async () => {
    const user = userEvent.setup({ delay: null });
    create.mockImplementation((_v, opts) => opts.onSuccess({ id: 'new', failedWindows: [] }));
    render(<SessionTypeFormScreen template="sop-review" />);
    await user.click(next(/^Continue$/));
    await user.click(next(/^Continue$/));
    await user.click(next(/^Continue$/));
    await user.click(next(/Publish session/));
    expect(create).toHaveBeenCalledTimes(1);
    const { body, windows } = create.mock.calls[0]![0];
    expect(body).toMatchObject({ name: 'SOP draft review', service_offering_ids: ['o4'] });
    expect(body.questions).toHaveLength(2);
    expect(windows).toEqual([]);
    expect(screen.getByRole('dialog', { name: 'Session published' })).toBeInTheDocument();
  });

  it('a name the server refuses sends the mentor back to step 1, on the field', async () => {
    const user = userEvent.setup({ delay: null });
    create.mockImplementation((_v, opts) =>
      opts.onError({
        kind: 'conflict',
        message: 'Some details need another look.',
        fields: { name: 'You already have a session with this name.' },
      }),
    );
    render(<SessionTypeFormScreen template="sop-review" />);
    for (const n of [/^Continue$/, /^Continue$/, /^Continue$/, /Publish session/])
      await user.click(next(n));
    expect(screen.getByText('Step 1 of 4 · Define your session')).toBeInTheDocument();
    expect(screen.getByText('You already have a session with this name.')).toBeInTheDocument();
    // Filled but refused: focus goes to it, and "required fields" would be untrue.
    expect(screen.getByRole('textbox', { name: 'Session name' })).toHaveFocus();
    expect(screen.queryByText('Fill in the required fields to continue.')).toBeNull();
  });

  it('delete a question confirms first', async () => {
    const user = userEvent.setup({ delay: null });
    render(<SessionTypeFormScreen template="sop-review" />);
    await user.click(next(/^Continue$/));
    await user.click(screen.getByRole('button', { name: 'Delete question 1' }));
    const dialog = screen.getByRole('alertdialog', { name: 'Delete this question?' });
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));
    expect(
      screen
        .getAllByRole('listitem')
        .filter((li) => li.closest('ol[aria-label="Intake questions"]')),
    ).toHaveLength(1);
  });

  it('editing a question, then deleting one above it, saves the right question (review of #49)', async () => {
    const user = userEvent.setup({ delay: null });
    render(<SessionTypeFormScreen template="sop-review" />);
    await user.click(next(/^Continue$/));
    await user.click(screen.getByRole('button', { name: 'Edit question 2' }));
    await user.click(screen.getByRole('button', { name: 'Delete question 1' }));
    await user.click(
      within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Delete' }),
    );
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
    const user = userEvent.setup({ delay: null });
    create.mockImplementationOnce((_v, opts) =>
      opts.onError({
        kind: 'validation',
        message: 'x',
        fields: { 'question-1': 'Check this question and its options.' },
      }),
    );
    render(<SessionTypeFormScreen template="sop-review" />);
    for (const n of [/^Continue$/, /^Continue$/, /^Continue$/, /Publish session/])
      await user.click(next(n));
    expect(screen.getByText('Step 2 of 4 · Prepare for session')).toBeInTheDocument();
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
    for (const n of [/^Continue$/, /^Continue$/, /Publish session/]) await user.click(next(n));
    // Shown with "Use my defaults" too (the server can refuse inherited rules).
    expect(screen.getByText('Check the length and booking rules.')).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: /Customize for this session/ }));
    expect(screen.queryByText('Check the length and booking rules.')).toBeNull();
  });

  it('never shows platform values as "my default" while the mentor’s are loading or failed', async () => {
    const user = userEvent.setup({ delay: null });
    defaultsMock = { data: null, isLoading: true, error: null, retry: vi.fn() };
    const { unmount } = render(<SessionTypeFormScreen template="sop-review" />);
    await user.click(next(/^Continue$/));
    await user.click(next(/^Continue$/));
    expect(screen.getByText('Loading your defaults…')).toBeInTheDocument();
    await user.click(next(/^Continue$/));
    // Nothing to name yet: no approval value, and no rule values, are guessed.
    expect(screen.queryByText(/confirmed straight away|you approve each booking/i)).toBeNull();
    expect(screen.getByText('Your default')).toBeInTheDocument();
    expect(screen.getByText('My defaults')).toBeInTheDocument();
    unmount();
    const retry = vi.fn();
    defaultsMock = { data: null, isLoading: false, error: { kind: 'server', message: 'x' }, retry };
    render(<SessionTypeFormScreen template="sop-review" />);
    await user.click(next(/^Continue$/));
    await user.click(next(/^Continue$/));
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalled();
  });

  // A rule change used to patch the whole draft, which cleared every error.
  it('changing a booking rule keeps the hours error on screen', async () => {
    const user = userEvent.setup({ delay: null });
    render(<SessionTypeFormScreen template="sop-review" />);
    await user.click(next(/^Continue$/));
    await user.click(next(/^Continue$/));
    await user.click(screen.getByRole('radio', { name: /Set availability for this session/ }));
    await user.click(next(/^Continue$/));
    const error = 'Turn on at least one day, or use your weekly availability.';
    expect(screen.getByText(error)).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: /Customize for this session/ }));
    await user.selectOptions(screen.getByRole('combobox', { name: 'Minimum notice' }), '72');
    expect(screen.getByText(error)).toBeInTheDocument();
  });

  it('"Use my defaults" sends nothing of its own; custom rules send all five', async () => {
    const user = userEvent.setup({ delay: null });
    const toStep3 = async () => {
      await user.click(next(/^Continue$/));
      await user.click(next(/^Continue$/));
    };
    const publish = async () => {
      await user.click(next(/^Continue$/));
      await user.click(next(/Publish session/));
    };
    const { unmount } = render(<SessionTypeFormScreen template="sop-review" />);
    await toStep3();
    expect(
      screen.getByText(
        '60 min · 2 days notice · 4 weeks ahead · 15 min buffer · You approve each booking',
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
    render(<SessionTypeFormScreen template="sop-review" />);
    await toStep3();
    await user.click(screen.getByRole('radio', { name: /Customize for this session/ }));
    await user.selectOptions(screen.getByRole('combobox', { name: 'Session length' }), '90');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Minimum notice' }), '72');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Approve bookings' }), 'off');
    await publish();
    expect(create.mock.calls[0]![0].body).toMatchObject({
      duration_minutes: 90,
      min_notice_minutes: 4320,
      requires_booking_confirmation: false,
    });
  });

  it('step 3 edits the defaults and weekly hours where they live: Settings and Calendar, in a new tab', async () => {
    const user = userEvent.setup({ delay: null });
    render(<SessionTypeFormScreen template="sop-review" />);
    await user.click(next(/^Continue$/));
    await user.click(next(/^Continue$/));
    const rules = screen.getByRole('link', { name: 'Manage booking rules (opens in a new tab)' });
    expect(rules).toHaveAttribute('href', '/settings/booking');
    expect(rules).toHaveAttribute('target', '_blank');
    expect(rules).toHaveTextContent('Manage booking rules ↗');
    const hours = screen.getByRole('link', {
      name: 'Manage weekly availability (opens in a new tab)',
    });
    expect(hours).toHaveAttribute('href', '/calendar');
    expect(hours).toHaveAttribute('target', '_blank');
    // The zone is named with the times (product rule).
    expect(
      screen.getByText('Mon 5 pm–8 pm · Sat 9 am–1 pm · Lagos (WAT) time'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Edit defaults|Edit weekly hours/ })).toBeNull();
  });

  it('approval: the inherit option names the default; the hint says what the choice is', async () => {
    const user = userEvent.setup({ delay: null });
    render(<SessionTypeFormScreen template="sop-review" />);
    await user.click(next(/^Continue$/));
    await user.click(next(/^Continue$/));
    await user.click(screen.getByRole('radio', { name: /Customize for this session/ }));
    const select = screen.getByRole('combobox', { name: 'Approve bookings' });
    expect(select).toHaveAccessibleDescription('Choose how bookings are confirmed.');
    expect(
      within(select)
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toEqual([
      'You approve each booking (your default)',
      'You approve each booking',
      'Confirmed straight away',
    ]);
  });

  it('review: one Booking rules row while inheriting; a row per rule once customized', async () => {
    const user = userEvent.setup({ delay: null });
    const { unmount } = render(<SessionTypeFormScreen template="sop-review" />);
    for (let i = 0; i < 3; i++) await user.click(next(/^Continue$/));
    expect(
      screen.getByText('My defaults · 60 min · 2 days notice · 4 weeks ahead · 15 min buffer'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Your weekly availability (Mon 5 pm–8 pm · Sat 9 am–1 pm)'),
    ).toBeInTheDocument();
    expect(screen.getByText('You approve each booking (your default)')).toBeInTheDocument();
    expect(screen.queryByText('Session length')).toBeNull();
    unmount();

    render(<SessionTypeFormScreen template="sop-review" />);
    await user.click(next(/^Continue$/));
    await user.click(next(/^Continue$/));
    await user.click(screen.getByRole('radio', { name: /Customize for this session/ }));
    await user.selectOptions(screen.getByRole('combobox', { name: 'Approve bookings' }), 'off');
    await user.click(next(/^Continue$/));
    for (const k of [
      'Session length',
      'Minimum notice',
      'Booking window',
      'Buffer between sessions',
    ])
      expect(screen.getByText(k)).toBeInTheDocument();
    expect(screen.getByText('48 hours')).toBeInTheDocument();
    expect(screen.getByText('Confirmed straight away')).toBeInTheDocument();
    expect(screen.queryByText(/^My defaults/)).toBeNull();
  });
});

describe('SessionTypeFormScreen — review of #60', () => {
  const toStep3 = async (user: ReturnType<typeof userEvent.setup>, template = 'sop-review') => {
    render(<SessionTypeFormScreen template={template} />);
    await user.click(next(/^Continue$/));
    await user.click(next(/^Continue$/));
  };

  it('"Customize for this session" starts from the mentor’s own values', async () => {
    const user = userEvent.setup({ delay: null });
    await toStep3(user);
    await user.click(screen.getByRole('radio', { name: /Customize for this session/ }));
    // READY: 60 min, 48 hrs, 28 days, 15 min — not the blank draft's 24 hrs notice.
    expect(screen.getByRole('combobox', { name: 'Session length' })).toHaveValue('60');
    expect(screen.getByRole('combobox', { name: 'Minimum notice' })).toHaveValue('48');
  });

  it('a template whose length isn’t the mentor’s starts with its own rules; one that is, follows the defaults', async () => {
    const user = userEvent.setup({ delay: null });
    // Mock visa interview is 45 min; the mentor's default is 60.
    await toStep3(user, 'mock-visa-interview');
    expect(screen.getByRole('combobox', { name: 'Session length' })).toHaveValue('45');
    expect(screen.getByRole('combobox', { name: 'Minimum notice' })).toHaveValue('48');
  });

  it('"Booking window" offers only what the platform maximum allows', async () => {
    const user = userEvent.setup({ delay: null });
    defaultsMock = { ...READY, data: { ...READY.data, windowDays: 14, maxWindowDays: 14 } };
    await toStep3(user);
    await user.click(screen.getByRole('radio', { name: /Customize for this session/ }));
    const own = screen.getByRole('combobox', { name: 'Booking window' });
    expect(
      within(own)
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toEqual(['1 week', '2 weeks']);
  });

  it('defaults that arrive late don’t swallow what the mentor typed (review r2 of #60)', async () => {
    const user = userEvent.setup({ delay: null });
    defaultsMock = { data: null, isLoading: true, error: null, retry: vi.fn() };
    const { rerender } = render(<SessionTypeFormScreen template="mock-visa-interview" />);
    await user.type(screen.getByRole('textbox', { name: 'Session name' }), ' 2');
    // The defaults fail: the platform's 60 min isn't the template's 45, so its rules become its own.
    defaultsMock = {
      data: null,
      isLoading: false,
      error: { kind: 'server', message: 'x' },
      retry: vi.fn(),
    };
    rerender(<SessionTypeFormScreen template="mock-visa-interview" />);
    await user.click(screen.getByRole('button', { name: 'Back to sessions' }));
    // Still an unsaved change: it asks before leaving.
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByRole('alertdialog', { name: 'Discard this session?' })).toBeInTheDocument();
  });

  it('"Best for mentees who are…": the design’s six chips, several picked, sent in order', async () => {
    const user = userEvent.setup({ delay: null });
    render(<SessionTypeFormScreen template="sop-review" />);
    const group = screen.getByRole('group', { name: 'Best for mentees who are' });
    expect(
      within(group)
        .getAllByRole('button')
        .map((b) => b.textContent),
    ).toEqual([
      'Exploring',
      'Researching schools & scholarships',
      'Preparing documents',
      'Applying',
      'Preparing for interview',
      'Waiting for a decision',
    ]);
    // No custom stage any more (PRD step 1).
    expect(screen.queryByRole('textbox', { name: 'Another stage' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Add' })).toBeNull();
    expect(
      screen.getByText('Choose the stages this session is most useful for.'),
    ).toBeInTheDocument();
    await user.click(within(group).getByRole('button', { name: 'Applying' }));
    await user.click(within(group).getByRole('button', { name: 'Exploring' }));
    await user.click(within(group).getByRole('button', { name: 'Preparing documents' }));
    // Unpicking one keeps the others.
    await user.click(within(group).getByRole('button', { name: 'Exploring' }));
    for (const n of [/^Continue$/, /^Continue$/, /^Continue$/, /Publish session/])
      await user.click(next(n));
    expect(create.mock.calls[0]![0].body).toMatchObject({
      application_stages: ['applying', 'preparing_documents'],
    });
  });

  it('a refused stage (422) shows on step 1 under the hint, and clears when the stages change', async () => {
    const user = userEvent.setup({ delay: null });
    render(<SessionTypeFormScreen template="sop-review" />);
    create.mockImplementationOnce((_v, opts) =>
      opts.onError({ kind: 'validation', message: 'x', fields: { stage: 'Check the stage.' } }),
    );
    for (const n of [/^Continue$/, /^Continue$/, /^Continue$/, /Publish session/])
      await user.click(next(n));
    const stageError = screen.getByText('Check the stage.').closest('p');
    expect(stageError).toHaveAttribute('role', 'alert');
    const group = screen.getByRole('group', { name: 'Best for mentees who are' });
    expect(group).toHaveAccessibleDescription(/Check the stage\./);
    // Focus goes to the stages: their first chip.
    expect(within(group).getByRole('button', { name: 'Exploring' })).toHaveFocus();
    const stageHint = screen.getByText('Choose the stages this session is most useful for.');
    expect(
      stageHint.compareDocumentPosition(stageError!) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    await user.click(within(group).getByRole('button', { name: 'Applying' }));
    expect(screen.queryByText('Check the stage.')).toBeNull();
  });
});

describe('the setup lock: /session-types/new opened by URL (PRD "App shell and access")', () => {
  it('a declined mentor gets the explainer as the page, not the wizard', () => {
    viewer = viewers.mentorDeclined;
    render(<SessionTypeFormScreen template="sop-review" />);
    expectLockedPage(explainer.mentorNotApproved('Sessions'));
    expect(screen.queryByRole('textbox', { name: 'Session name' })).toBeNull();
  });

  it.each([
    [
      'a mentor who never sent their application',
      viewers.mentorUnfinished,
      explainer.mentorSetup('Sessions'),
    ],
    ['a mentor sign-up, not started', viewers.mentorSignup, explainer.mentorSetup('Sessions')],
  ])('%s gets the setup explainer, never the wizard', (_who, v, e) => {
    viewer = v;
    render(<SessionTypeFormScreen template="sop-review" />);
    expectLockedPage(e);
    expect(screen.queryByRole('textbox', { name: 'Session name' })).toBeNull();
  });

  it('a mentor in review still creates sessions (only Bookings locks)', () => {
    viewer = viewers.mentorReview;
    render(<SessionTypeFormScreen template="sop-review" />);
    expect(screen.getByRole('textbox', { name: 'Session name' })).toBeInTheDocument();
  });
});

describe('/session-types/new at the session limit (backend PR 3)', () => {
  it('opened at the limit: the sentence and the way back, not the form', () => {
    viewer = { ...mentor, sessionTypeLimit: 5 };
    ownCount = 5;
    render(<SessionTypeFormScreen template={null} />);
    expect(
      screen.getByRole('heading', { level: 1, name: 'You can offer up to 5 sessions.' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Back to sessions' })).toHaveAttribute(
      'href',
      '/session-types',
    );
    expect(screen.queryByRole('textbox', { name: 'Session name' })).toBeNull();
  });

  it('under the limit, or with none known, the form opens', () => {
    viewer = { ...mentor, sessionTypeLimit: 5 };
    ownCount = 4;
    const { unmount } = render(<SessionTypeFormScreen template={null} />);
    expect(screen.getByRole('textbox', { name: 'Session name' })).toBeInTheDocument();
    unmount();
    viewer = { ...mentor, sessionTypeLimit: null };
    ownCount = 9;
    render(<SessionTypeFormScreen template={null} />);
    expect(screen.getByRole('textbox', { name: 'Session name' })).toBeInTheDocument();
  });
});
