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
      { slug: 'application-documents', label: 'Application documents', id: 'o4' },
      { slug: 'school-selection', label: 'School selection', id: 'o1' },
    ],
    isLoading: false,
    error: null,
  }),
}));

const create = vi.fn();
let createError: unknown = null;
vi.mock('@/lib/api/data/sessionTypes', async (orig) => ({
  autoIcon: (await orig<typeof import('@/lib/api/data/sessionTypes')>()).autoIcon,
  useCreateSessionType: () => ({ create, isPending: false, error: createError, reset: vi.fn() }),
  useRetryWindows: () => ({ retry: vi.fn(), isPending: false }),
  useMentorDefaults: () => ({
    data: { windowDays: 28, breakMin: 15, requiresApproval: true },
    isLoading: false,
    error: null,
    retry: vi.fn(),
  }),
}));

beforeEach(() => {
  push.mockReset();
  create.mockReset();
  createError = null;
});
const next = (name: RegExp) => screen.getByRole('button', { name });

describe('CreateSessionTypeScreen', () => {
  it('a template pre-fills step 1; later steps are locked until reached', () => {
    render(<CreateSessionTypeScreen template="sop-review" />);
    expect(screen.getByRole('textbox', { name: 'Session name' })).toHaveValue('SOP draft review');
    expect(
      within(screen.getByRole('group', { name: 'Topics' })).getByRole('button', {
        name: 'Application documents',
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
});
