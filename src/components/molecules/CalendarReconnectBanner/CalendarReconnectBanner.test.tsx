import { render, screen, within } from '@testing-library/react';
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
  const banner = () => screen.getByRole('button', { name: 'Reconnect' }).closest('div')!;

  it('says what is wrong and what it is costing', () => {
    render(<CalendarReconnectBanner {...props} />);
    expect(banner()).toHaveTextContent(
      'Google Calendar needs reconnecting. Until then, times you’re busy can still be booked.',
    );
  });

  /**
   * An atomic assertive wrapper re-read the whole banner on every change, and
   * was least reliable at insertion, which is the moment that matters. Only
   * the line that changes announces (review of #357).
   */
  it('announces the line that changes, not the whole banner', () => {
    const { rerender } = render(<CalendarReconnectBanner {...props} />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    rerender(<CalendarReconnectBanner {...props} busy />);
    const live = screen.getByRole('status');
    expect(live).toHaveTextContent('Waiting for Google…');
    expect(live).not.toHaveTextContent('needs reconnecting');
  });

  /**
   * It is not an announcement a mentor can be done with: while it shows, their
   * busy times are bookable. It goes when the connection is repaired.
   */
  it('offers no way to dismiss it', () => {
    render(<CalendarReconnectBanner {...props} />);
    const buttons = within(banner()).getAllByRole('button');
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
    expect(banner()).toHaveTextContent('Waiting for Google…');
  });

  it('shows a failure in the banner, not somewhere the mentor may not look', () => {
    render(<CalendarReconnectBanner {...props} failure="Your browser blocked the pop-up." />);
    expect(banner()).toHaveTextContent('Your browser blocked the pop-up.');
    // Still the broken-state line too: the connection did not repair itself.
    expect(banner()).toHaveTextContent('needs reconnecting');
  });

  /** Waiting beats a stale failure from the attempt before. */
  it('shows the wait rather than the last failure once pressed again', () => {
    render(<CalendarReconnectBanner {...props} busy failure="Your browser blocked the pop-up." />);
    expect(banner()).toHaveTextContent('Waiting for Google…');
    expect(banner()).not.toHaveTextContent('blocked the pop-up');
  });

  it('stops offering where no calendar client is configured', () => {
    render(<CalendarReconnectBanner {...props} unavailable />);
    expect(screen.getByRole('button', { name: 'Reconnect' })).toBeDisabled();
  });
});
