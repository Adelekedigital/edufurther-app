import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fullProfile } from '@/components/organisms/ProfileHeader/profile.fixture';
import { addAward, editAward, h, removeAward, state } from './profileScreen.harness';
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
vi.mock('@/lib/api/data/profileEntries', async () =>
  (await import('./profileScreen.harness')).mocks.profileEntries(),
);

const owner = { approval: 'approved' as const, listed: true };
const own = { ...fullProfile, owner };
const assistantship = fullProfile.awards[0]!;

describe('MentorProfileScreen — scholarships and awards', () => {
  it('a mentee sees the funding badge and no controls', () => {
    h.profile = state({ data: fullProfile });
    render(<MentorProfileScreen handle="gbenga" />);
    const section = screen.getByRole('region', { name: 'Scholarships and awards' });
    expect(within(section).getByText('Fully funded')).toBeInTheDocument();
    expect(within(section).queryByRole('button')).toBeNull();
  });

  it('the owner adds one: "Add award" opens the form, and the page says it was added', async () => {
    h.profile = state({ data: own });
    const user = userEvent.setup();
    render(<MentorProfileScreen handle="gbenga" />);
    await user.click(screen.getByRole('button', { name: 'Add award' }));
    const dialog = screen.getByRole('dialog', { name: 'Add an award' });
    await user.type(within(dialog).getByRole('textbox', { name: 'Award name' }), 'Fulbright');
    await user.type(within(dialog).getByRole('textbox', { name: 'Awarded by' }), 'Stanford');
    await user.click(within(dialog).getByRole('button', { name: 'Add award' }));
    expect(addAward).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Fulbright', org: 'Stanford', funding: null }),
    );
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByText('Award added.')).toBeInTheDocument();
  });

  it('the owner edits one from its row, prefilled', async () => {
    h.profile = state({ data: own });
    const user = userEvent.setup();
    render(<MentorProfileScreen handle="gbenga" />);
    await user.click(screen.getByRole('button', { name: `Edit ${assistantship.title}` }));
    const dialog = screen.getByRole('dialog', { name: 'Edit award' });
    expect(within(dialog).getByRole('textbox', { name: 'Award name' })).toHaveValue(
      assistantship.title,
    );
    await user.click(within(dialog).getByRole('radio', { name: 'Partial' }));
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    expect(editAward).toHaveBeenCalledWith('a1', assistantship.values, {
      ...assistantship.values,
      funding: 'partial',
    });
    expect(screen.getByText('Award saved.')).toBeInTheDocument();
  });

  it('removing asks first, then focus goes to "Add award" (the row is gone)', async () => {
    h.profile = state({ data: own });
    h.onAwardRemoved = () => {
      h.profile = state({ data: { ...own, awards: [] } });
    };
    const user = userEvent.setup();
    render(<MentorProfileScreen handle="gbenga" />);
    await user.click(screen.getByRole('button', { name: `Edit ${assistantship.title}` }));
    const dialog = screen.getByRole('dialog', { name: 'Edit award' });
    await user.click(within(dialog).getByRole('button', { name: 'Delete award' }));
    expect(removeAward).not.toHaveBeenCalled();
    await user.click(
      within(within(dialog).getByRole('group', { name: 'Delete this award?' })).getByRole(
        'button',
        { name: 'Delete award' },
      ),
    );
    expect(removeAward).toHaveBeenCalledWith('a1');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByText('Award deleted.')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Add award' })[0]).toHaveFocus();
  });

  it('with none yet, the owner is invited to add one; a mentee sees no section', () => {
    h.profile = state({ data: { ...own, awards: [] } });
    const { unmount } = render(<MentorProfileScreen handle="gbenga" />);
    expect(screen.getByText('Add the funding you’ve won')).toBeInTheDocument();
    unmount();
    h.profile = state({ data: { ...fullProfile, awards: [] } });
    render(<MentorProfileScreen handle="gbenga" />);
    expect(screen.queryByRole('heading', { name: 'Scholarships and awards' })).toBeNull();
  });
});
