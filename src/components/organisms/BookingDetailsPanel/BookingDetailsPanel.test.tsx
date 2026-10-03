import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { sampleBookingFor } from '@/lib/utils/bookingTestFixtures';
import { BookingDetailsPanel } from './BookingDetailsPanel';

const props = (over: Partial<Parameters<typeof BookingDetailsPanel>[0]> = {}) => ({
  asSheet: false,
  booking: sampleBookingFor(),
  timeZone: 'America/New_York',
  onClose: vi.fn(),
  now: new Date('2026-10-03T12:00:00Z'),
  ...over,
});

describe('the desktop aside', () => {
  it('is an aside, not a dialog: the list behind it stays usable', () => {
    const p = props();
    render(
      <>
        <button type="button">Somewhere else</button>
        <BookingDetailsPanel {...p} />
      </>,
    );
    const panel = document.getElementById('booking-details')!;
    expect(panel.tagName).toBe('ASIDE');
    expect(panel).not.toHaveAttribute('role', 'dialog');
    expect(panel).not.toHaveAttribute('aria-modal');
  });

  it('is labelled by its own heading', () => {
    render(<BookingDetailsPanel {...props()} />);
    expect(screen.getByRole('complementary', { name: 'Booking details' })).toBeVisible();
  });

  it('leaves the page scrollable and does not steal focus', async () => {
    render(
      <>
        <button type="button">Outside</button>
        <BookingDetailsPanel {...props()} />
      </>,
    );
    expect(document.body.style.overflow).not.toBe('hidden');
    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'Outside' })).toHaveFocus();
  });
});

describe('the phone sheet', () => {
  it('is a modal dialog, labelled, with focus moved into it', async () => {
    render(<BookingDetailsPanel {...props({ asSheet: true })} />);
    const dialog = await screen.findByRole('dialog', { name: 'Booking details' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    await waitFor(() => expect(dialog.contains(document.activeElement)).toBe(true));
  });

  it('locks the page behind it, and unlocks on the way out', async () => {
    const { unmount } = render(<BookingDetailsPanel {...props({ asSheet: true })} />);
    await waitFor(() => expect(document.body.style.overflow).toBe('hidden'));
    unmount();
    await waitFor(() => expect(document.body.style.overflow).not.toBe('hidden'));
  });

  it('Escape closes it', async () => {
    const onClose = vi.fn();
    render(<BookingDetailsPanel {...props({ asSheet: true, onClose })} />);
    await screen.findByRole('dialog');
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });

  it('gives focus back to whatever opened it', async () => {
    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Opener
          </button>
          {open && <BookingDetailsPanel {...props({ asSheet: true, onClose: () => setOpen(false) })} />}
        </>
      );
    }
    render(<Harness />);
    const opener = screen.getByRole('button', { name: 'Opener' });
    await userEvent.click(opener);
    await screen.findByRole('dialog');
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    // Focus is back where the person left it, not on <body>.
    await waitFor(() => expect(opener).toHaveFocus());
  });

  it('keeps Tab inside', async () => {
    render(
      <>
        <button type="button">Outside</button>
        <BookingDetailsPanel {...props({ asSheet: true, onJoin: vi.fn() })} />
      </>,
    );
    const dialog = await screen.findByRole('dialog');
    await userEvent.tab();
    await userEvent.tab();
    expect(dialog.contains(document.activeElement)).toBe(true);
    expect(screen.getByRole('button', { name: 'Outside' })).not.toHaveFocus();
  });
});
