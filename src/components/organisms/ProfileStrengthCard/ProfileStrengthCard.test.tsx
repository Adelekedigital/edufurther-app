import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProfileStrengthCard } from './ProfileStrengthCard';

describe('ProfileStrengthCard', () => {
  it('is a labelled meter with its percentage', () => {
    render(<ProfileStrengthCard percent={77.8} tips={[]} />);
    const meter = screen.getByRole('meter', { name: 'Profile strength' });
    expect(meter).toHaveAttribute('aria-valuenow', '78');
    expect(meter).toHaveAttribute('aria-valuetext', '78%');
    expect(screen.getByRole('region', { name: 'Profile strength' })).toHaveTextContent('78%');
    expect(screen.queryByRole('list')).toBeNull();
  });

  it('each tip is an action: a button for an editor here, a link for elsewhere', async () => {
    const open = vi.fn();
    const user = userEvent.setup();
    render(
      <ProfileStrengthCard
        percent={40}
        tips={[
          { key: 'weekly_hours', label: 'Set your weekly hours', href: '/session-types' },
          { key: 'photo', label: 'Add a profile photo', onSelect: open },
        ]}
      />,
    );
    expect(screen.getByRole('link', { name: /Set your weekly hours/ })).toHaveAttribute(
      'href',
      '/session-types',
    );
    await user.click(screen.getByRole('button', { name: /Add a profile photo/ }));
    expect(open).toHaveBeenCalled();
  });
});
