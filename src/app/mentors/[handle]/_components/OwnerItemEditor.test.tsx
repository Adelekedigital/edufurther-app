import { render, screen } from '@testing-library/react';
import { fullProfile } from '@/components/organisms/ProfileHeader/profile.fixture';
import { addAward } from './profileScreen.harness';
import { OwnerItemEditor } from './OwnerItemEditor';

vi.mock('@/lib/api/data/profileEntries', async () =>
  (await import('./profileScreen.harness')).mocks.profileEntries(),
);

describe('OwnerItemEditor — review of #93', () => {
  it('editing an award that isn’t there any more is a load error, never an add (5)', () => {
    render(
      <OwnerItemEditor
        target={{ kind: 'award', id: 'gone' }}
        profile={fullProfile}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    );
    expect(screen.getByText(/couldn’t load this award/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save changes' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(addAward).not.toHaveBeenCalled();
  });
});
