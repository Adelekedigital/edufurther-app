import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AppError, Remote, Viewer } from '@/types/mentor';
import type { DeleteError, OwnSessionType } from '@/types/sessionType';
import { SessionTypesScreen } from './SessionTypesScreen';

const push = vi.fn();
vi.mock('next/navigation', () => ({
  usePathname: () => '/session-types',
  useRouter: () => ({ push }),
}));
vi.mock('@/lib/api/data/mentors', () => ({
  useTopics: () => ({
    topics: [{ slug: 'document-preparation', label: 'Document preparation', id: 'o4' }],
    isLoading: topicsLoading,
  }),
}));
const duplicate = vi.fn();
let topicsLoading = false;
vi.mock('@/lib/api/data/sessionTypeEdit', () => ({
  useDuplicateSessionType: () => ({ duplicate, isPending: false }),
}));

let viewer: Viewer;
vi.mock('@/app/_shell/useAppShell', () => ({
  useAppShell: () => ({
    viewer,
    member: viewer.kind === 'member' ? viewer : null,
    chrome: viewer.kind === 'guest' ? 'guest' : 'member',
    account: undefined,
    nav: viewer.kind === 'member' && viewer.isMentor ? 'mentor' : 'unknown',
  }),
}));

const TYPE: OwnSessionType = {
  id: 'a',
  name: 'SOP draft review',
  description: '',
  durationMin: 60,
  noticeMin: 1440,
  isLive: true,
  topics: [],
  icon: 'video_call',
  iconChoice: null,
  questionCount: 0,
  isFeatured: false,
  pendingDeletion: null,
  booked: { count: 0, lastEndsAt: null },
};
let list: Remote<OwnSessionType[]>;
const setLive = vi.fn();
let failLive: (id: string, live: boolean) => void = () => {};
const remove = vi.fn().mockResolvedValue({ kind: 'deleted' });
let deleteErr: DeleteError | null = null;
vi.mock('@/lib/api/data/sessionTypes', () => ({
  useOwnSessionTypes: () => list,
  useSetLive: (onFailed: (id: string, live: boolean) => void) => {
    failLive = onFailed;
    return setLive;
  },
  useDeleteSessionType: () => ({ remove, isPending: false, error: deleteErr, reset: vi.fn() }),
  useSetFeatured: (onFailed: typeof failFeature) => {
    failFeature = onFailed;
    return setFeatured;
  },
  useRestoreSessionType: (_failed: unknown, done: typeof restoreDone) => {
    restoreDone = done;
    return { restore, pendingIds: restorePending };
  },
}));
const setFeatured = vi.fn();
let failFeature: (id: string, featured: boolean, e: AppError) => void = () => {};
let restorePending: string[] = [];
let restoreDone: (id: string, r: 'kept' | 'gone') => void = () => {};
const restore = vi.fn();
const sop = () => screen.getByRole('article', { name: 'SOP draft review' });
/** What the page's live region last read out. */
const announced = () =>
  screen
    .getAllByRole('status')
    .map((s) => s.textContent)
    .join(' | ');

const mentor: Viewer = {
  kind: 'member',
  id: 'm1',
  firstName: 'Gbenga',
  initial: 'G',
  isMentee: false,
  isApprovedMentor: false,
  isMentor: true,
  completedSessions: 0,
  credits: null,
};
const idle = (over: Partial<Remote<OwnSessionType[]>> = {}): Remote<OwnSessionType[]> => ({
  data: null,
  isLoading: false,
  error: null,
  retry: vi.fn(),
  ...over,
});

beforeEach(() => {
  list = idle({ data: [TYPE] });
  deleteErr = null;
  setLive.mockClear();
  setFeatured.mockClear();
  restore.mockReset();
  restorePending = [];
  topicsLoading = false;
  duplicate.mockReset();
  remove.mockClear();
  remove.mockResolvedValue({ kind: 'deleted' });
});

describe('SessionTypesScreen', () => {
  it('while the viewer is unknown the list is loading — never "no session types"', () => {
    viewer = { kind: 'loading', signedIn: true };
    list = idle(); // the query is disabled until we know it's a mentor: no data, not loading
    render(<SessionTypesScreen />);
    expect(screen.getByRole('status', { name: 'Loading your session types' })).toBeInTheDocument();
    expect(screen.queryByText('Create your first session type')).toBeNull();
  });

  it('a guest is asked to log in and comes back here', () => {
    viewer = { kind: 'guest' };
    render(<SessionTypesScreen />);
    // The shell's header also offers Log in; the page's own one returns here.
    expect(within(screen.getByRole('main')).getByRole('link', { name: 'Log in' })).toHaveAttribute(
      'href',
      '/login?next=%2Fsession-types',
    );
  });

  it('a member without a mentor profile is told this page is for mentors', () => {
    viewer = { ...mentor, isMentor: false, isMentee: true } as Viewer;
    render(<SessionTypesScreen />);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Session types are for mentors' }),
    ).toBeInTheDocument();
  });

  it('any mentor state (here, not approved) manages session types', () => {
    viewer = mentor;
    render(<SessionTypesScreen />);
    expect(screen.getByRole('heading', { level: 1, name: 'Session types' })).toBeInTheDocument();
    expect(screen.getByRole('article', { name: 'SOP draft review' })).toBeInTheDocument();
  });

  it('delete confirms in a danger modal first', async () => {
    viewer = mentor;
    const user = userEvent.setup({ delay: null });
    render(<SessionTypesScreen />);
    await user.click(screen.getByRole('button', { name: 'More actions for SOP draft review' }));
    await user.click(screen.getByRole('menuitem', { name: /Delete/ }));
    expect(screen.getByRole('dialog', { name: 'Delete this session type?' })).toBeInTheDocument();
    expect(remove).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(remove).toHaveBeenCalledWith('a');
  });

  it('with sessions booked, Delete asks to schedule the deletion for the last one’s date', async () => {
    viewer = mentor;
    list = idle({
      data: [{ ...TYPE, booked: { count: 2, lastEndsAt: '2026-10-14T18:00:00Z' } }],
    });
    const user = userEvent.setup({ delay: null });
    render(<SessionTypesScreen />);
    await user.click(screen.getByRole('button', { name: 'More actions for SOP draft review' }));
    await user.click(screen.getByRole('menuitem', { name: /Delete/ }));
    const dialog = screen.getByRole('dialog', { name: 'Schedule deletion for Oct 14?' });
    expect(dialog).toHaveTextContent(
      'Hidden from mentees now. The 2 booked sessions go ahead first.',
    );
    // Not featured: nothing about featuring (design reply #10 adds it for the featured type only).
    expect(dialog).not.toHaveTextContent(/featured/);
    await user.click(within(dialog).getByRole('button', { name: 'Schedule deletion' }));
    expect(remove).toHaveBeenCalledWith('a');
  });

  it('with nothing booked, Delete says it can’t be undone and deletes', async () => {
    viewer = mentor;
    const user = userEvent.setup({ delay: null });
    render(<SessionTypesScreen />);
    await user.click(screen.getByRole('button', { name: 'More actions for SOP draft review' }));
    await user.click(screen.getByRole('menuitem', { name: /Delete/ }));
    const dialog = screen.getByRole('dialog', { name: 'Delete this session type?' });
    expect(dialog).toHaveTextContent('This can’t be undone.');
    expect(dialog).not.toHaveTextContent(/booked/);
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));
    expect(remove).toHaveBeenCalledWith('a');
  });

  it('a type scheduled for deletion says when, offers "Keep it", and nothing else that would show it', async () => {
    viewer = mentor;
    list = idle({
      data: [
        {
          ...TYPE,
          isLive: false,
          pendingDeletion: { deletesAfter: '2026-10-14T18:00:00Z', bookedCount: 2 },
        },
      ],
    });
    const user = userEvent.setup({ delay: null });
    render(<SessionTypesScreen />);
    const row = screen.getByRole('article', { name: 'SOP draft review' });
    expect(row).toHaveTextContent('Scheduled for deletion');
    expect(row).toHaveTextContent(
      'Hidden. Deleted after its last booked session on Oct 14. The 2 booked sessions go ahead.',
    );
    expect(within(row).queryByRole('switch')).toBeNull();
    expect(within(row).queryByRole('button', { name: /Copy share link/ })).toBeNull();
    await user.click(
      within(row).getByRole('button', { name: 'More actions for SOP draft review' }),
    );
    expect(screen.queryByRole('menuitem', { name: /Delete|featured/ })).toBeNull();
    await user.keyboard('{Escape}');
    await user.click(within(row).getByRole('button', { name: 'Keep it: SOP draft review' }));
    expect(restore).toHaveBeenCalledWith('a');
  });

  it('featuring another asks first; with none featured it just features', async () => {
    viewer = mentor;
    list = idle({
      data: [
        { ...TYPE, isFeatured: true },
        { ...TYPE, id: 'b', name: 'Visa prep' },
      ],
    });
    const user = userEvent.setup({ delay: null });
    render(<SessionTypesScreen />);
    expect(screen.getByRole('article', { name: 'SOP draft review' })).toHaveTextContent('Featured');
    await user.click(screen.getByRole('button', { name: 'More actions for Visa prep' }));
    await user.click(screen.getByRole('menuitem', { name: /Mark as featured/ }));
    const dialog = screen.getByRole('dialog', { name: 'Feature “Visa prep” instead?' });
    expect(dialog).toHaveTextContent('“SOP draft review” will no longer be featured.');
    await user.click(within(dialog).getByRole('button', { name: 'Feature this instead' }));
    expect(setFeatured).toHaveBeenCalledWith('b', true);
    setFeatured.mockClear();
    await user.click(screen.getByRole('button', { name: 'More actions for SOP draft review' }));
    await user.click(screen.getByRole('menuitem', { name: /Remove from featured/ }));
    expect(setFeatured).toHaveBeenCalledWith('a', false);
  });

  it('a hidden type isn’t sent to be featured: the row says to show it first', async () => {
    viewer = mentor;
    list = idle({
      data: [
        { ...TYPE, isLive: false },
        { ...TYPE, id: 'b', name: 'Visa prep', isFeatured: true },
      ],
    });
    const user = userEvent.setup({ delay: null });
    render(<SessionTypesScreen />);
    await user.click(screen.getByRole('button', { name: 'More actions for SOP draft review' }));
    await user.click(screen.getByRole('menuitem', { name: /Mark as featured/ }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(setFeatured).not.toHaveBeenCalled();
    expect(sop()).toHaveTextContent(
      'Show it to mentees first: a hidden session type can’t be featured.',
    );
  });

  it('a failed feature says why by what went wrong, not always "hidden"', () => {
    viewer = mentor;
    render(<SessionTypesScreen />);
    const cases: [AppError['kind'], boolean, string][] = [
      ['offline', true, 'Couldn’t feature it. Check your connection and try again.'],
      ['validation', true, 'Show it to mentees first: a hidden session type can’t be featured.'],
      ['server', true, 'Couldn’t feature it. Try again in a moment.'],
      ['server', false, 'Couldn’t remove it from featured. Try again in a moment.'],
    ];
    for (const [kind, featured, text] of cases) {
      act(() => failFeature('a', featured, { kind, message: '' }));
      expect(sop()).toHaveTextContent(text);
      expect(announced()).toContain(text);
    }
  });

  it('a failed delete keeps the confirm open with our copy', async () => {
    viewer = mentor;
    deleteErr = {
      kind: 'server',
      message: 'We couldn’t delete it. Something went wrong. Try again.',
    };
    remove.mockRejectedValue(deleteErr);
    const user = userEvent.setup({ delay: null });
    render(<SessionTypesScreen />);
    await user.click(screen.getByRole('button', { name: 'More actions for SOP draft review' }));
    await user.click(screen.getByRole('menuitem', { name: /Delete/ }));
    const dialog = screen.getByRole('dialog', { name: 'Delete this session type?' });
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));
    expect(screen.getByRole('dialog', { name: 'Delete this session type?' })).toBeInTheDocument();
    expect(within(dialog).getByRole('alert')).toHaveTextContent(
      'We couldn’t delete it. Something went wrong. Try again.',
    );
  });

  it('scheduling clears the row’s old message and is read out', async () => {
    viewer = mentor;
    remove.mockResolvedValue({
      kind: 'scheduled',
      deletesAfter: '2026-10-14T12:00:00Z',
      bookedCount: 2,
    });
    const user = userEvent.setup({ delay: null });
    render(<SessionTypesScreen />);
    act(() => failFeature('a', true, { kind: 'validation', message: '' }));
    await user.click(screen.getByRole('button', { name: 'More actions for SOP draft review' }));
    await user.click(screen.getByRole('menuitem', { name: /Delete/ }));
    expect(sop()).not.toHaveTextContent('Show it to mentees first');
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));
    await waitFor(() =>
      expect(announced()).toContain('Deletion scheduled for Oct 14. Hidden from mentees now.'),
    );
  });

  it('after a delete, focus goes to the next row’s “⋯”, or to Create when none is left', async () => {
    viewer = mentor;
    list = idle({ data: [TYPE, { ...TYPE, id: 'b', name: 'Visa prep' }] });
    const user = userEvent.setup({ delay: null });
    const { rerender } = render(<SessionTypesScreen />);
    await user.click(screen.getByRole('button', { name: 'More actions for SOP draft review' }));
    await user.click(screen.getByRole('menuitem', { name: /Delete/ }));
    // The list refetch removes the row as the dialog closes.
    remove.mockImplementation(async () => {
      list = idle({ data: [{ ...TYPE, id: 'b', name: 'Visa prep' }] });
      return { kind: 'deleted' };
    });
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));
    rerender(<SessionTypesScreen />);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'More actions for Visa prep' })).toHaveFocus(),
    );
    expect(announced()).toContain('“SOP draft review” was deleted.');

    remove.mockImplementation(async () => {
      list = idle({ data: [] });
      return { kind: 'deleted' };
    });
    await user.click(screen.getByRole('button', { name: 'More actions for Visa prep' }));
    await user.click(screen.getByRole('menuitem', { name: /Delete/ }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Delete' }));
    rerender(<SessionTypesScreen />);
    await waitFor(() =>
      expect(screen.getAllByRole('link', { name: 'Create session type' })[0]).toHaveFocus(),
    );
  });

  it('"Keep it" says it was kept; a second click while it waits sends nothing', async () => {
    viewer = mentor;
    list = idle({
      data: [{ ...TYPE, isLive: false, pendingDeletion: { deletesAfter: null, bookedCount: 1 } }],
    });
    restore.mockImplementation((id: string) => restoreDone(id, 'kept'));
    const user = userEvent.setup({ delay: null });
    const { rerender } = render(<SessionTypesScreen />);
    await user.click(screen.getByRole('button', { name: 'Keep it: SOP draft review' }));
    expect(announced()).toContain('Kept. “SOP draft review” is hidden until you show it.');
    restore.mockClear();
    restorePending = ['a'];
    rerender(<SessionTypesScreen />);
    const keep = screen.getByRole('button', { name: 'Keep it: SOP draft review' });
    expect(keep).toHaveAttribute('aria-disabled', 'true');
    await user.click(keep);
    expect(restore).not.toHaveBeenCalled();
  });

  it('while one row is being kept, another row’s "Keep it" still works', async () => {
    viewer = mentor;
    const pending = { deletesAfter: null, bookedCount: 1 };
    list = idle({
      data: [
        { ...TYPE, isLive: false, pendingDeletion: pending },
        { ...TYPE, id: 'b', name: 'Visa prep', isLive: false, pendingDeletion: pending },
      ],
    });
    restorePending = ['a'];
    const user = userEvent.setup({ delay: null });
    render(<SessionTypesScreen />);
    await user.click(screen.getByRole('button', { name: 'Keep it: Visa prep' }));
    expect(restore).toHaveBeenCalledWith('b');
  });

  it('two rows kept at once each say how it went, in whichever order they answer', async () => {
    viewer = mentor;
    const pending = { deletesAfter: null, bookedCount: 1 };
    list = idle({
      data: [
        { ...TYPE, isLive: false, pendingDeletion: pending },
        { ...TYPE, id: 'b', name: 'Visa prep', isLive: false, pendingDeletion: pending },
      ],
    });
    const user = userEvent.setup({ delay: null });
    const { rerender } = render(<SessionTypesScreen />);
    await user.click(screen.getByRole('button', { name: 'Keep it: SOP draft review' }));
    await user.click(screen.getByRole('button', { name: 'Keep it: Visa prep' }));
    act(() => restoreDone('a', 'kept'));
    expect(announced()).toContain('Kept. “SOP draft review” is hidden until you show it.');
    // Visa prep was already deleted: its row goes, focus moves to the row above.
    list = idle({ data: [{ ...TYPE, isLive: false }] });
    act(() => restoreDone('b', 'gone'));
    rerender(<SessionTypesScreen />);
    expect(announced()).toContain('“Visa prep” was already deleted.');
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'More actions for SOP draft review' }),
      ).toHaveFocus(),
    );
  });

  it('scheduling the featured type says it also stops being featured (design reply #10)', async () => {
    viewer = mentor;
    list = idle({
      data: [
        { ...TYPE, isFeatured: true, booked: { count: 2, lastEndsAt: '2026-10-14T12:00:00Z' } },
      ],
    });
    const user = userEvent.setup({ delay: null });
    render(<SessionTypesScreen />);
    await user.click(screen.getByRole('button', { name: 'More actions for SOP draft review' }));
    await user.click(screen.getByRole('menuitem', { name: /Delete/ }));
    expect(screen.getByRole('dialog', { name: 'Schedule deletion for Oct 14?' })).toHaveTextContent(
      'Hidden from mentees now. The 2 booked sessions go ahead first. It also stops being featured.',
    );
  });

  it('signed in without a usable account: told why, never "for mentors"', () => {
    viewer = { kind: 'accountExists' };
    const { unmount } = render(<SessionTypesScreen />);
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'This email already has an EduFurther account.',
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/for mentors/)).toBeNull();
    unmount();
    viewer = { kind: 'unlinked' };
    render(<SessionTypesScreen />);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Your account isn’t ready yet.' }),
    ).toBeInTheDocument();
  });

  it('the switch asks first: showing, hiding, and hiding the last visible one (design update)', async () => {
    viewer = mentor;
    list = idle({ data: [TYPE, { ...TYPE, id: 'b', name: 'Visa prep', isLive: false }] });
    const user = userEvent.setup({ delay: null });
    render(<SessionTypesScreen />);
    await user.click(screen.getByRole('switch', { name: 'Visible to mentees: SOP draft review' }));
    // The only visible one: hiding it says what that means for the profile.
    let dialog = screen.getByRole('dialog', { name: 'Hide your last session type?' });
    expect(dialog).toHaveTextContent('Your profile will show “Not taking bookings”');
    await user.click(within(dialog).getByRole('button', { name: 'Keep visible' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(setLive).not.toHaveBeenCalled();
    await user.click(screen.getByRole('switch', { name: 'Visible to mentees: SOP draft review' }));
    dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Hide it' }));
    expect(setLive).toHaveBeenCalledWith('a', false);
    // Showing the hidden one asks too.
    await user.click(screen.getByRole('switch', { name: 'Visible to mentees: Visa prep' }));
    dialog = screen.getByRole('dialog', { name: 'Show “Visa prep” to mentees?' });
    await user.click(within(dialog).getByRole('button', { name: 'Show it' }));
    expect(setLive).toHaveBeenCalledWith('b', true);
  });

  it('Duplicate copies with a name not already used, and says what didn’t come across', async () => {
    viewer = mentor;
    const user = userEvent.setup({ delay: null });
    duplicate.mockResolvedValueOnce({
      id: 'new',
      name: 'SOP draft review (copy)',
      failed: ['hours'],
    });
    render(<SessionTypesScreen />);
    await user.click(screen.getByRole('button', { name: 'More actions for SOP draft review' }));
    await user.click(screen.getByRole('menuitem', { name: /Duplicate/ }));
    expect(duplicate).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'a', offeringIds: { 'document-preparation': 'o4' } }),
    );
    expect(
      await within(sop()).findByText(
        '“SOP draft review (copy)” was added, hidden, but its dedicated hours didn’t copy. Check it before you show it.',
      ),
    ).toBeInTheDocument();
  });

  it('Edit goes to the edit screen; the share link books this type on the profile', async () => {
    const user = userEvent.setup({ delay: null });
    viewer = mentor;
    const write = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: write },
      configurable: true,
    });
    render(<SessionTypesScreen />);
    await user.click(screen.getByRole('button', { name: 'More actions for SOP draft review' }));
    await user.click(screen.getByRole('menuitem', { name: /Edit/ }));
    expect(push).toHaveBeenCalledWith('/session-types/a/edit');
    await user.click(screen.getByRole('button', { name: 'Copy share link for SOP draft review' }));
    expect(write).toHaveBeenCalledWith(expect.stringMatching(/\/mentors\/m1\?book=a$/));
    expect(await screen.findByText('Link copied')).toBeInTheDocument();
  });

  it('Duplicate says it’s copying, then that the copy is hidden; a refusal is said on the row (review of #74)', async () => {
    viewer = mentor;
    const user = userEvent.setup({ delay: null });
    let finish: (v: unknown) => void = () => {};
    duplicate.mockImplementationOnce(() => new Promise((r) => (finish = r)));
    render(<SessionTypesScreen />);
    await user.click(screen.getByRole('button', { name: 'More actions for SOP draft review' }));
    await user.click(screen.getByRole('menuitem', { name: /Duplicate/ }));
    expect(within(sop()).getByText('Copying “SOP draft review”…')).toBeInTheDocument();
    // Read out from the page's one region, not a region inserted with its text.
    expect(announced()).toContain('Copying “SOP draft review”…');
    await act(async () => finish({ id: 'n', name: 'SOP draft review (copy)', failed: [] }));
    expect(
      within(sop()).getByText(
        '“SOP draft review (copy)” was added, hidden. Check it, then show it to mentees.',
      ),
    ).toBeInTheDocument();

    duplicate.mockRejectedValueOnce({
      message: 'We couldn’t duplicate it. You’re offline. Try again.',
    });
    await user.click(screen.getByRole('button', { name: 'More actions for SOP draft review' }));
    await user.click(screen.getByRole('menuitem', { name: /Duplicate/ }));
    expect(
      await within(sop()).findByText('We couldn’t duplicate it. You’re offline. Try again.'),
    ).toBeInTheDocument();
  });

  it('Duplicate waits for the topics, so a copy never loses them', async () => {
    viewer = mentor;
    topicsLoading = true;
    const user = userEvent.setup({ delay: null });
    render(<SessionTypesScreen />);
    await user.click(screen.getByRole('button', { name: 'More actions for SOP draft review' }));
    await user.click(screen.getByRole('menuitem', { name: /Duplicate/ }));
    expect(duplicate).not.toHaveBeenCalled();
    expect(
      within(sop()).getByText('Still loading your topics. Try again in a moment.'),
    ).toBeInTheDocument();
  });

  it('no share link until we know whose profile it is', () => {
    viewer = { kind: 'loading', signedIn: true };
    list = idle({ data: [TYPE] });
    render(<SessionTypesScreen />);
    expect(screen.queryByRole('button', { name: /Copy share link/ })).toBeNull();
  });

  it('after a duplicate’s note, a failed switch on that row still reads as an error (review r2 of #74)', async () => {
    viewer = mentor;
    const user = userEvent.setup({ delay: null });
    duplicate.mockResolvedValueOnce({ id: 'n', name: 'SOP draft review (copy)', failed: [] });
    render(<SessionTypesScreen />);
    await user.click(screen.getByRole('button', { name: 'More actions for SOP draft review' }));
    await user.click(screen.getByRole('menuitem', { name: /Duplicate/ }));
    const note = await within(sop()).findByText(/was added, hidden/);
    expect(note.textContent).not.toMatch(/^error/);
    await act(async () => failLive('a', false));
    const failed = within(sop()).getByText(/Couldn’t hide it\./);
    // The error icon leads an error message; a note has none.
    expect(failed.textContent).toMatch(/^error/);
  });
});
