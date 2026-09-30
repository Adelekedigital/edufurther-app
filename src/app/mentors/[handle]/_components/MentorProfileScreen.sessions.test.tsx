import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fullProfile } from '@/components/organisms/ProfileHeader/profile.fixture';
import { h, ownType, quickEdit, remote, restoreType, state } from './profileScreen.harness';
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
const hidden = ownType({ id: 'st9', name: 'Mock visa interview', isLive: false, durationMin: 45 });
const pending = ownType({
  id: 'st8',
  name: 'Program shortlist',
  isLive: false,
  pendingDeletion: { deletesAfter: '2026-10-14T15:00:00Z', bookedCount: 2 },
});

function onSessions(types = [ownType(), hidden, pending]) {
  h.search = new URLSearchParams('tab=sessions');
  h.profile = state({ data: own });
  h.ownTypes = remote(types);
}
const card = (name: string) => screen.getByRole('heading', { level: 3, name }).closest('li')!;

describe('MentorProfileScreen — the owner’s session types', () => {
  it('lists every type they own, hidden and scheduled ones marked, with no Book', () => {
    onSessions();
    render(<MentorProfileScreen handle="gbenga" />);
    const shown = card('SOP draft review');
    expect(
      within(shown).getByRole('switch', { name: 'Visible to mentees: SOP draft review' }),
    ).toBeChecked();
    expect(within(shown).getByRole('button', { name: 'Edit SOP draft review' })).toBeVisible();
    expect(within(shown).getByRole('button', { name: 'Delete SOP draft review' })).toBeVisible();
    // The stage comes from the public profile while the type is visible.
    expect(within(shown).getByText('Drafting')).toBeInTheDocument();

    const off = card('Mock visa interview');
    expect(within(off).getByText('Hidden')).toBeInTheDocument();
    expect(
      within(off).getByRole('switch', { name: 'Visible to mentees: Mock visa interview' }),
    ).not.toBeChecked();

    const going = card('Program shortlist');
    expect(within(going).getByText('Scheduled for deletion')).toBeInTheDocument();
    expect(
      within(going).getByText(
        'Hidden from mentees. Deleted after its last booked session on Oct 14. The 2 booked sessions go ahead.',
      ),
    ).toBeInTheDocument();
    expect(within(going).queryByRole('switch')).toBeNull();

    expect(screen.getByRole('link', { name: /New session type/ })).toHaveAttribute(
      'href',
      '/session-types/new',
    );
    expect(screen.queryByRole('button', { name: /Book session/ })).toBeNull();
  });

  it('keeps the Sessions tab when every type is hidden', () => {
    onSessions([hidden]);
    h.profile = state({ data: { ...own, sessionTypes: [] } });
    render(<MentorProfileScreen handle="gbenga" />);
    expect(screen.getByRole('tab', { name: 'Sessions (0)' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(card('Mock visa interview')).toBeInTheDocument();
  });

  it('"Keep it" restores a type scheduled for deletion', async () => {
    onSessions();
    const user = userEvent.setup();
    render(<MentorProfileScreen handle="gbenga" />);
    await user.click(
      within(card('Program shortlist')).getByRole('button', { name: 'Keep it: Program shortlist' }),
    );
    expect(restoreType).toHaveBeenCalledWith('st8');
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
    // No price: sessions are free until payments ship.
    expect(within(dialog).queryByText('Price')).toBeNull();
    expect(within(dialog).getByRole('link', { name: /Open full editor/ })).toHaveAttribute(
      'href',
      '/session-types/st1/edit',
    );
    await user.selectOptions(within(dialog).getByRole('combobox', { name: 'Length' }), '45');
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    expect(quickEdit).toHaveBeenCalledWith({ id: 'st1', durationMin: 45, live: undefined });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByText('SOP draft review saved.')).toBeInTheDocument();
  });

  it('quick edit can hide the type', async () => {
    onSessions();
    const user = userEvent.setup();
    render(<MentorProfileScreen handle="gbenga" />);
    await user.click(screen.getByRole('button', { name: 'Edit SOP draft review' }));
    const dialog = screen.getByRole('dialog', { name: 'Edit SOP draft review' });
    await user.click(within(dialog).getByRole('switch', { name: 'Visible to mentees' }));
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    expect(quickEdit).toHaveBeenCalledWith({ id: 'st1', durationMin: undefined, live: false });
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

  it('while their own list fails, the public list shows with a retry', async () => {
    onSessions();
    const retry = vi.fn();
    h.ownTypes = { data: null, isLoading: false, error: { message: 'x' } as never, retry };
    const user = userEvent.setup();
    render(<MentorProfileScreen handle="gbenga" />);
    expect(screen.getByText(/We couldn’t load your hidden session types/)).toBeInTheDocument();
    expect(card('SOP draft review')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalled();
  });
});
