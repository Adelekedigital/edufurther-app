import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fullProfile, newProfile } from '@/components/organisms/ProfileHeader/profile.fixture';
import { h, saveBackground, saveTopics, state } from './profileScreen.harness';
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
vi.mock('@/lib/api/data/profileEdit', async () =>
  (await import('./profileScreen.harness')).mocks.profileEdit(),
);
vi.mock('@/lib/api/data/booking', async () =>
  (await import('./profileScreen.harness')).mocks.booking(),
);
vi.mock('@/lib/api/data/profileItems', async () =>
  (await import('./profileScreen.harness')).mocks.profileItems(),
);
vi.mock('@/lib/api/data/catalog', async () =>
  (await import('./profileScreen.harness')).mocks.catalog(),
);
vi.mock('@/lib/api/data/mentors', async (original) => ({
  ...(await original<object>()),
  ...(await import('./profileScreen.harness')).mocks.topics(),
}));

const owner = { approval: 'approved' as const, listed: true };
const own = { ...fullProfile, owner };

describe('MentorProfileScreen — the owner’s topics', () => {
  it('only the owner gets "Edit topics"', () => {
    h.profile = state({ data: fullProfile });
    render(<MentorProfileScreen handle="gbenga" />);
    expect(screen.queryByRole('button', { name: 'Edit topics' })).toBeNull();
  });

  it('opens with their topics chosen; Save sends the ids, closes, says so, and returns focus', async () => {
    h.profile = state({ data: own });
    const user = userEvent.setup();
    render(<MentorProfileScreen handle="gbenga" />);
    await user.click(screen.getByRole('button', { name: 'Edit topics' }));
    const dialog = screen.getByRole('dialog', { name: 'What you help with' });
    expect(within(dialog).getByRole('button', { name: 'School selection' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await user.click(within(dialog).getByRole('button', { name: 'Test preparation' }));
    await user.click(within(dialog).getByRole('button', { name: 'Save topics' }));
    expect(saveTopics).toHaveBeenCalledWith(['o1', 'o6', 'o2', 'o5']);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByText('Topics saved.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Edit topics' })).toHaveFocus();
  });

  it('a failed save stays open and says why', async () => {
    h.profile = state({ data: own });
    h.itemsOk = false;
    h.itemsError = 'That didn’t save. Try again.';
    const user = userEvent.setup();
    render(<MentorProfileScreen handle="gbenga" />);
    await user.click(screen.getByRole('button', { name: 'Edit topics' }));
    const dialog = screen.getByRole('dialog', { name: 'What you help with' });
    expect(within(dialog).getByRole('alert')).toHaveTextContent('That didn’t save. Try again.');
  });
});

describe('MentorProfileScreen — the owner’s background', () => {
  it('"Edit" opens it prefilled; unchanged, Save closes without sending', async () => {
    h.profile = state({ data: own });
    const user = userEvent.setup();
    render(<MentorProfileScreen handle="gbenga" />);
    await user.click(screen.getByRole('button', { name: 'Edit background' }));
    const dialog = screen.getByRole('dialog', { name: 'Edit background' });
    expect(within(dialog).getByRole('combobox', { name: 'From' })).toHaveValue('Nigeria');
    expect(within(dialog).getByRole('combobox', { name: 'Studied in' })).toHaveValue(
      'United States',
    );
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    expect(saveBackground).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('a changed country and a new language are sent as ids', async () => {
    h.profile = state({ data: own });
    const user = userEvent.setup();
    render(<MentorProfileScreen handle="gbenga" />);
    await user.click(screen.getByRole('button', { name: 'Edit background' }));
    const dialog = screen.getByRole('dialog', { name: 'Edit background' });
    const from = within(dialog).getByRole('combobox', { name: 'From' });
    await user.clear(from);
    await user.type(from, 'gha');
    await user.click(within(dialog).getByRole('option', { name: 'Ghana' }));
    await user.click(within(dialog).getByRole('button', { name: 'French' }));
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    expect(saveBackground).toHaveBeenCalledWith(
      { originId: 'c-ng', studyId: 'c-us', languageIds: ['en', 'yo'] },
      { originId: 'c-gh', studyId: 'c-us', languageIds: ['en', 'yo', 'fr'] },
    );
    expect(screen.getByText('Background saved.')).toBeInTheDocument();
  });

  it('with nothing added, the owner is invited to add it; a mentee sees no section', async () => {
    h.profile = state({ data: { ...newProfile, owner } });
    const user = userEvent.setup();
    const { unmount } = render(<MentorProfileScreen handle="new" />);
    expect(screen.getByText('Tell mentees where you’re from')).toBeInTheDocument();
    // The heading's "Add" and the card's button: one action, one name.
    const adds = screen.getAllByRole('button', { name: 'Add background' });
    expect(adds).toHaveLength(2);
    await user.click(adds[1]!);
    expect(screen.getByRole('dialog', { name: 'Edit background' })).toBeInTheDocument();
    unmount();
    h.profile = state({ data: newProfile });
    render(<MentorProfileScreen handle="new" />);
    expect(screen.queryByRole('heading', { name: 'Background' })).toBeNull();
  });
});
