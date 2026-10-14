import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SetupBanner } from './SetupBanner';

describe('SetupBanner', () => {
  it('shows progress, the next step, and a routed action', () => {
    render(
      <SetupBanner
        doneCount={2}
        total={4}
        pct={50}
        nextTitle="connect google calendar"
        action={{ label: 'Connect', href: '/integrations' }}
      />,
    );
    const region = screen.getByRole('region', { name: 'Account setup' });
    expect(region).toHaveTextContent('2 of 4 done');
    expect(region).toHaveTextContent('Next: connect google calendar');
    expect(screen.getByRole('progressbar', { name: 'Account setup progress' })).toHaveAttribute(
      'aria-valuenow',
      '50',
    );
    expect(screen.getByRole('link', { name: 'Connect' })).toHaveAttribute('href', '/integrations');
  });

  it('runs the in-page action (copy link) when the step has no route', async () => {
    const onClick = vi.fn();
    render(
      <SetupBanner
        doneCount={3}
        total={4}
        pct={75}
        nextTitle="share your profile"
        action={{ label: 'Copy link', onClick }}
      />,
    );
    await userEvent.setup().click(screen.getByRole('button', { name: 'Copy link' }));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
