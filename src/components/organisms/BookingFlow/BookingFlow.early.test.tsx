import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EARLY_TIME_NOTE } from '@/lib/copy/booking';
import { BookingFlow } from './BookingFlow';
import { pinToday, props, remote, setPhone } from './BookingFlow.testkit';

pinToday();

// The viewer's zone is the device's, UTC here: 8:30 am is early, 9:00 am is not.
const early = ['2026-09-28T08:30:00Z', '2026-09-28T09:00:00Z'];

describe('BookingFlow early-morning note', () => {
  beforeEach(() => setPhone(false));

  it('shows and announces the note for an early time, without blocking the request', async () => {
    const user = userEvent.setup();
    render(<BookingFlow {...props({ sessionTypeId: 'st2', slots: remote(early) })} />);
    expect(screen.queryByText(EARLY_TIME_NOTE)).not.toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: '8:30 am' }));
    // Once on screen, once in the always-present live region.
    expect(screen.getAllByText(EARLY_TIME_NOTE)).toHaveLength(2);
    expect(screen.getAllByRole('status').some((s) => s.textContent === EARLY_TIME_NOTE)).toBe(true);
    expect(screen.getByRole('button', { name: /^Request Mon, Sep 28/ })).toBeEnabled();
  });

  it('hides the note for a time from 9:00 am on', async () => {
    const user = userEvent.setup();
    render(<BookingFlow {...props({ sessionTypeId: 'st2', slots: remote(early) })} />);
    await user.click(screen.getByRole('radio', { name: '8:30 am' }));
    await user.click(screen.getByRole('radio', { name: '9:00 am' }));
    expect(screen.queryByText(EARLY_TIME_NOTE)).not.toBeInTheDocument();
  });
});
