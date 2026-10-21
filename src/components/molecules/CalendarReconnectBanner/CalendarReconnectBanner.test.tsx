import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CalendarReconnectBanner } from './CalendarReconnectBanner';

const props = {
  busy: false,
  unavailable: false,
  failure: null,
  onReconnect: vi.fn(),
};

beforeEach(() => props.onReconnect.mockReset());

describe('CalendarReconnectBanner', () => {
  /** The cost is the reason to press the button, so it is on screen. */
  it('says what is wrong and what it is costing', () => {
    render(<CalendarReconnectBanner {...props} />);
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Google Calendar needs reconnecting. Until then, times you’re busy can still be booked.',
    );
  });

  /**
   * It is not an announcement a mentor can be done with: while it shows, their
   * busy times are bookable. It goes when the connection is repaired.
   */
  it('offers no way to dismiss it', () => {
    render(<CalendarReconnectBanner {...props} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(1);
    expect(buttons[0]).toHaveAccessibleName('Reconnect');
  });

  it('reconnects in place rather than sending them to Integrations', async () => {
    render(<CalendarReconnectBanner {...props} />);
    const button = screen.getByRole('button', { name: 'Reconnect' });
    // The design's button is a link to Integrations; the founder overrode that.
    expect(button).not.toHaveAttribute('href');
    await userEvent.click(button);
    expect(props.onReconnect).toHaveBeenCalled();
  });

  /**
   * `busy` on a Button is cursor-only, so without a line the mentor sees an
   * unchanged button that swallows every press for up to three minutes.
   */
  it('says it is waiting while the consent window is open', () => {
    render(<CalendarReconnectBanner {...props} busy />);
    expect(screen.getByRole('alert')).toHaveTextContent('Waiting for Google…');
  });

  it('shows a failure in the banner, not somewhere the mentor may not look', () => {
    render(<CalendarReconnectBanner {...props} failure="Your browser blocked the pop-up." />);
    expect(screen.getByRole('alert')).toHaveTextContent('Your browser blocked the pop-up.');
    // Still the broken-state line too: the connection did not repair itself.
    expect(screen.getByRole('alert')).toHaveTextContent('needs reconnecting');
  });

  /** Waiting beats a stale failure from the attempt before. */
  it('shows the wait rather than the last failure once pressed again', () => {
    render(<CalendarReconnectBanner {...props} busy failure="Your browser blocked the pop-up." />);
    expect(screen.getByRole('alert')).toHaveTextContent('Waiting for Google…');
    expect(screen.getByRole('alert')).not.toHaveTextContent('blocked the pop-up');
  });

  it('stops offering where no calendar client is configured', () => {
    render(<CalendarReconnectBanner {...props} unavailable />);
    expect(screen.getByRole('button', { name: 'Reconnect' })).toBeDisabled();
  });
});
