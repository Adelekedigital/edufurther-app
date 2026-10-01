import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fullProfile } from '@/components/organisms/ProfileHeader/profile.fixture';
import {
  h,
  ownType,
  quickEdit,
  remote,
  removeType,
  restoreType,
  setLive,
  state,
} from './profileScreen.harness';
import { MentorProfileScreen } from './MentorProfileScreen';

// The data hooks, mocked (hoisted above the imports; state lives in the harness).
vi.mock('next/navigation', async () =>
  (await import('./profileScreen.harness')).mocks.navigation(),
);
vi.mock('@/app/_shell/useAppShell', async () =>
  (await import('./profileScreen.harness')).mocks.appShell(),
);
vi.mock('@/lib/api/data/reviews', async () =>
  (await import('./profileScreen.harness')).mocks.reviews(),
);
vi.mock('@/lib/api/data/reviewWrite', async () =>
  (await import('./profileScreen.harness')).mocks.reviewWrite(),
);
vi.mock('@/lib/api/data/similar', async () =>
  (await import('./profileScreen.harness')).mocks.similar(),
);
vi.mock('@/lib/api/data/profile', async () =>
  (await import('./profileScreen.harness')).mocks.profile(),
);
vi.mock('@/lib/api/data/cover', async () =>
  (await import('./profileScreen.harness')).mocks.cover(),
);
vi.mock('@/lib/api/data/avatar', async () =>
  (await import('./profileScreen.harness')).mocks.avatar(),
);
vi.mock('@/lib/api/data/profileEdit', async () =>
  (await import('./profileScreen.harness')).mocks.profileEdit(),
);
vi.mock('@/lib/api/data/booking', async () =>
  (await import('./profileScreen.harness')).mocks.booking(),
);
vi.mock('@/lib/api/data/sessionTypes', async () =>
  (await import('./profileScreen.harness')).mocks.sessionTypes(),
);
vi.mock('@/lib/api/data/sessionTypeQuick', async () =>
  (await import('./profileScreen.harness')).mocks.sessionTypeQuick(),
);

const own = { ...fullProfile, owner: { approval: 'approved' as const, listed: true } };
const cv = ownType({ id: 'st2', name: 'CV review', durationMin: 45 });
const hidden = ownType({ id: 'st9', name: 'Mock visa interview', isLive: false });
const pending = ownType({
  id: 'st8',
  name: 'Program shortlist',
  isLive: false,
  pendingDeletion: { deletesAfter: '2026-10-14T15:00:00Z', bookedCount: 2 },
});

function onSessions(types = [ownType(), cv, hidden, pending]) {
  h.search = new URLSearchParams('tab=sessions');
  h.profile = state({ data: own });
  h.ownTypes = remote(types);
}
const card = (name: string) => screen.getByRole('heading', { level: 3, name }).closest('li')!;
const SHOW_AGAIN = 'To show it again, turn it on in Session types.';

describe('MentorProfileScreen — the owner’s session types (active only)', () => {
  it('shows only active types, each with its controls; hidden and scheduled ones aren’t here', () => {
    onSessions();
    render(<MentorProfileScreen handle="gbenga" />);
    const sop = card('SOP draft review');
    expect(
      within(sop).getByRole('switch', { name: 'Visible to mentees: SOP draft review' }),
    ).toBeChecked();
    expect(within(sop).getByRole('button', { name: 'Edit SOP draft review' })).toBeVisible();
    expect(within(sop).getByRole('button', { name: 'Delete SOP draft review' })).toBeVisible();
    expect(within(sop).getByText('Drafting')).toBeInTheDocument();
    expect(card('CV review')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Mock visa interview' })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Program shortlist' })).toBeNull();
    expect(screen.queryByText(/Hidden|Scheduled for deletion|Keep it/)).toBeNull();
    expect(screen.getByRole('link', { name: /New session type/ })).toHaveAttribute(
      'href',
      '/session-types/new',
    );
    expect(screen.queryByRole('button', { name: /Book session/ })).toBeNull();
  });

  it('no active type: the tab stays, with "New session type"', () => {
    onSessions([hidden]);
    h.profile = state({ data: { ...own, sessionTypes: [] } });
    render(<MentorProfileScreen handle="gbenga" />);
    expect(screen.getByRole('tab', { name: 'Sessions (0)' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.queryByRole('switch')).toBeNull();
    expect(screen.getByRole('link', { name: /New session type/ })).toBeInTheDocument();
  });

  it('the switch asks first, says where it comes back, then hides; focus moves on', async () => {
    onSessions();
    const user = userEvent.setup();
    render(<MentorProfileScreen handle="gbenga" />);
    await user.click(screen.getByRole('switch', { name: 'Visible to mentees: SOP draft review' }));
    expect(setLive).not.toHaveBeenCalled();
    const confirm = screen.getByRole('dialog', { name: 'Hide “SOP draft review” from mentees?' });
    expect(confirm).toHaveTextContent(`It leaves your profile and Explore`);
    expect(confirm).toHaveTextContent(SHOW_AGAIN);
    await user.click(within(confirm).getByRole('button', { name: 'Hide it' }));
    expect(setLive).toHaveBeenCalledWith('st1', false);
    expect(
      screen.getByText('“SOP draft review” is hidden. You can show it again in Session types.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit CV review' })).toHaveFocus();
  });

  it('"Keep visible" changes nothing', async () => {
    onSessions();
    const user = userEvent.setup();
    render(<MentorProfileScreen handle="gbenga" />);
    await user.click(screen.getByRole('switch', { name: 'Visible to mentees: CV review' }));
    await user.click(screen.getByRole('button', { name: 'Keep visible' }));
    expect(setLive).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('the last active type says what hiding it means', async () => {
    onSessions([ownType(), hidden]);
    const user = userEvent.setup();
    render(<MentorProfileScreen handle="gbenga" />);
    await user.click(screen.getByRole('switch', { name: 'Visible to mentees: SOP draft review' }));
    const confirm = screen.getByRole('dialog', { name: 'Hide your last session type?' });
    expect(confirm).toHaveTextContent('Your profile will show “Not taking bookings”');
    expect(confirm).toHaveTextContent(SHOW_AGAIN);
  });

  it('a refused switch says so', () => {
    onSessions();
    render(<MentorProfileScreen handle="gbenga" />);
    act(() => h.onLiveFailed?.('st1', false));
    expect(
      screen.getByText('Couldn’t hide it. Check your connection and try again.'),
    ).toBeInTheDocument();
  });

  it('quick edit sends only the length that changed, closes, and says so', async () => {
    onSessions();
    const user = userEvent.setup();
    render(<MentorProfileScreen handle="gbenga" />);
    await user.click(screen.getByRole('button', { name: 'Edit SOP draft review' }));
    const dialog = screen.getByRole('dialog', { name: 'Edit SOP draft review' });
    expect(
      within(dialog).getByText('Changes show on your profile straight away.'),
    ).toBeInTheDocument();
    // Price reads "Free", not editable, until payments are designed (design reply #62).
    expect(within(dialog).getByText('Price')).toHaveTextContent('PriceFree');
    expect(within(dialog).getByRole('link', { name: /Open full editor/ })).toHaveAttribute(
      'href',
      '/session-types/st1/edit',
    );
    await user.selectOptions(within(dialog).getByRole('combobox', { name: 'Length' }), '45');
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    expect(quickEdit).toHaveBeenCalledWith({ id: 'st1', durationMin: 45, live: undefined });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByText('“SOP draft review” saved.')).toBeInTheDocument();
  });

  it('quick edit’s "Visible" off asks first too, then saves and the card leaves', async () => {
    onSessions();
    const user = userEvent.setup();
    render(<MentorProfileScreen handle="gbenga" />);
    await user.click(screen.getByRole('button', { name: 'Edit SOP draft review' }));
    const dialog = screen.getByRole('dialog', { name: 'Edit SOP draft review' });
    await user.click(within(dialog).getByRole('switch', { name: 'Visible to mentees' }));
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    expect(quickEdit).not.toHaveBeenCalled();
    const confirm = screen.getByRole('dialog', { name: 'Hide “SOP draft review” from mentees?' });
    await user.click(within(confirm).getByRole('button', { name: 'Hide it' }));
    expect(quickEdit).toHaveBeenCalledWith({ id: 'st1', durationMin: undefined, live: false });
    expect(
      screen.getByText('“SOP draft review” is hidden. You can show it again in Session types.'),
    ).toBeInTheDocument();
  });

  it('nothing changed: Save closes without a request', async () => {
    onSessions();
    const user = userEvent.setup();
    render(<MentorProfileScreen handle="gbenga" />);
    await user.click(screen.getByRole('button', { name: 'Edit SOP draft review' }));
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(quickEdit).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('a failed save keeps the modal open and says why', async () => {
    onSessions();
    h.quickOk = false;
    h.quickError = { copy: 'That didn’t save. Try again.' };
    const user = userEvent.setup();
    render(<MentorProfileScreen handle="gbenga" />);
    await user.click(screen.getByRole('button', { name: 'Edit SOP draft review' }));
    expect(screen.getByRole('alert')).toHaveTextContent('That didn’t save. Try again.');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Length' }), '90');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(screen.getByRole('dialog', { name: 'Edit SOP draft review' })).toBeInTheDocument();
  });

  it('an older length stays offered, so opening quick edit never changes it', async () => {
    onSessions([ownType({ durationMin: 15 })]);
    const user = userEvent.setup();
    render(<MentorProfileScreen handle="gbenga" />);
    await user.click(screen.getByRole('button', { name: 'Edit SOP draft review' }));
    const length = screen.getByRole('combobox', { name: 'Length' });
    expect(length).toHaveValue('15');
    expect(
      within(length)
        .getAllByRole('option')
        .map((o) => o.textContent),
    ).toEqual(['15 min', '30 min', '45 min', '60 min', '90 min']);
  });

  it('Delete asks first; deleted, it says so and focus moves on', async () => {
    onSessions();
    removeType.mockResolvedValue({ kind: 'deleted' });
    const user = userEvent.setup();
    render(<MentorProfileScreen handle="gbenga" />);
    await user.click(screen.getByRole('button', { name: 'Delete SOP draft review' }));
    const confirm = screen.getByRole('dialog', { name: 'Delete this session type?' });
    await user.click(within(confirm).getByRole('button', { name: 'Delete' }));
    expect(removeType).toHaveBeenCalledWith('st1');
    expect(await screen.findByText('“SOP draft review” was deleted.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit CV review' })).toHaveFocus();
  });

  it('Delete with sessions booked schedules it, says when, and where to manage it', async () => {
    onSessions([ownType({ booked: { count: 2, lastEndsAt: '2026-10-14T15:00:00Z' } })]);
    removeType.mockResolvedValue({
      kind: 'scheduled',
      deletesAfter: '2026-10-14T15:00:00Z',
      bookedCount: 2,
    });
    const user = userEvent.setup();
    render(<MentorProfileScreen handle="gbenga" />);
    await user.click(screen.getByRole('button', { name: 'Delete SOP draft review' }));
    const confirm = screen.getByRole('dialog', { name: 'Schedule deletion for Oct 14?' });
    await user.click(within(confirm).getByRole('button', { name: 'Schedule deletion' }));
    expect(
      await screen.findByText(
        'Deletion scheduled for Oct 14. Hidden from mentees now. Manage it in Session types.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /New session type/ })).toHaveFocus();
  });

  it('a type not yet on the public profile reads its stages from Session types', () => {
    onSessions([
      ownType({ id: 'st7', name: 'Essay sprint', stages: ['drafting_stage', 'revisions'] }),
    ]);
    render(<MentorProfileScreen handle="gbenga" />);
    expect(within(card('Essay sprint')).getByText('Drafting, Revising')).toBeInTheDocument();
  });

  it('in "View as mentee", the mentee view: no owner controls', async () => {
    onSessions();
    const user = userEvent.setup();
    render(<MentorProfileScreen handle="gbenga" />);
    await user.click(screen.getByRole('button', { name: 'View as mentee' }));
    expect(screen.queryByRole('switch', { name: /Visible to mentees/ })).toBeNull();
    expect(screen.queryByRole('link', { name: /New session type/ })).toBeNull();
  });

  it('while their own list fails, the public list shows with a retry', async () => {
    onSessions();
    const retry = vi.fn();
    h.ownTypes = { data: null, isLoading: false, error: { message: 'x' } as never, retry };
    const user = userEvent.setup();
    render(<MentorProfileScreen handle="gbenga" />);
    expect(screen.getByText(/We couldn’t load your session types for editing/)).toBeInTheDocument();
    expect(card('SOP draft review')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalled();
  });
});
