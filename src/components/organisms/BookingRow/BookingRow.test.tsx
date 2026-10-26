import { readFileSync } from 'node:fs';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '@/components/atoms/Button/Button';
import { sampleBookingFor } from '@/lib/utils/bookingTestFixtures';
import { BookingRow } from './BookingRow';

const NOW = new Date('2026-10-03T12:00:00Z');
const at = (h: number) => new Date(NOW.getTime() + h * 3_600_000).toISOString();

const row = (props: Partial<Parameters<typeof BookingRow>[0]> = {}) =>
  render(
    <BookingRow
      booking={sampleBookingFor({ startsAt: at(26), endsAt: at(27) })}
      timeZone="Africa/Lagos"
      now={NOW}
      {...props}
    />,
  );

const css = () => readFileSync('src/components/organisms/BookingRow/BookingRow.module.css', 'utf8');
const rule = (selector: string) =>
  css().match(new RegExp(`\\${selector}\\s*\\{([^}]*)\\}`))?.[1] ?? '';

describe('the corner is a labelled button, not a menu', () => {
  it('offers Details, named by the booking it opens', () => {
    row({ onOpenDetails: () => {} });
    expect(
      screen.getByRole('button', {
        name: 'Details for School shortlist session with Amara Okafor',
      }),
    ).toBeVisible();
  });

  it('opens the panel when pressed', async () => {
    const onOpenDetails = vi.fn();
    row({ onOpenDetails });
    await userEvent.click(screen.getByRole('button', { name: /^Details for/ }));
    expect(onOpenDetails).toHaveBeenCalledTimes(1);
  });

  it('hides nothing behind a ⋯: no menu on the row at all', () => {
    row({ onOpenDetails: () => {} });
    expect(screen.queryByRole('button', { name: /More options/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(screen.queryByText('⋯')).not.toBeInTheDocument();
    expect(screen.queryByText('more_horiz')).not.toBeInTheDocument();
  });

  it('the chevron is decoration, so the label is read once', () => {
    row({ onOpenDetails: () => {} });
    // Scoped to the button: the row is full of hidden glyphs, and the one that
    // matters is the one inside the control. Unhidden, it would append the
    // ligature's own text — "Details chevron_right" — to the spoken name.
    const corner = screen.getByRole('button', { name: /^Details for/ });
    expect(corner.querySelector('[aria-hidden="true"]')?.textContent).toBe('chevron_right');
  });

  it('points at the panel it reveals, and only where that panel exists', () => {
    row({ onOpenDetails: () => {}, answersControls: 'booking-details' });
    expect(screen.getByRole('button', { name: /^Details for/ })).toHaveAttribute(
      'aria-controls',
      'booking-details',
    );
    // `aria-controls` naming an element that is not mounted is a broken
    // pointer, so the attribute is absent rather than guessed.
    row({ onOpenDetails: () => {} });
    expect(screen.getAllByRole('button', { name: /^Details for/ })[1]).not.toHaveAttribute(
      'aria-controls',
    );
  });

  it('renders no corner at all where there is nothing to open', () => {
    row();
    expect(screen.queryByRole('button', { name: /^Details for/ })).not.toBeInTheDocument();
  });
});

describe('the row keeps the actions that are its own job', () => {
  /** A mentor's pending row, as the screen builds it. */
  const pending = () => ({
    booking: sampleBookingFor({ status: 'pending', respondBy: at(5) }),
    onOpenDetails: () => {},
    actions: (
      <>
        <Button variant="secondary-outlined" size="small">
          Accept
        </Button>
        <Button variant="text-destructive" size="small">
          Decline
        </Button>
      </>
    ),
  });

  it('Accept and Decline stay here — answering a request is the row’s work', () => {
    row(pending());
    expect(screen.getByRole('button', { name: 'Accept' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Decline' })).toBeVisible();
  });

  it('calling the session off is not one tap from a scrolling list', () => {
    row({
      booking: sampleBookingFor({ startsAt: at(26), endsAt: at(27) }),
      onOpenDetails: () => {},
    });
    expect(screen.queryByRole('button', { name: /Cancel session/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Withdraw/ })).not.toBeInTheDocument();
  });

  it('Details comes before the actions in the DOM, so a phone tabs down and stops', () => {
    // Below 1100px the actions take their own line underneath. Reading order
    // has to match: tabbing down to them and then back up to the corner was
    // the bug this order avoids, and `order` only swaps them horizontally.
    const { container } = row(pending());
    const order = [...container.querySelectorAll('button')].map((el) => el.textContent);
    expect(order[0]).toMatch(/^Details/);
    expect(order.slice(1)).toEqual(['Accept', 'Decline']);
  });

  it('the corner is not in the actions rail, which drops below the card on a phone', () => {
    const { container } = row(pending());
    expect(container.querySelector('.actions')?.textContent).toBe('AcceptDecline');
    expect(container.querySelector('.details')).toBeTruthy();
  });
});

describe('the corner is operable without a mouse', () => {
  it('is in the tab order, reached before the row’s other controls', async () => {
    row({ onOpenDetails: () => {}, actions: <Button size="small">Accept</Button> });
    await userEvent.tab();
    expect(screen.getByRole('button', { name: /^Details for/ })).toHaveFocus();
  });

  it('fires on Enter and Space, being a real button', async () => {
    const onOpenDetails = vi.fn();
    row({ onOpenDetails });
    await userEvent.tab();
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard(' ');
    expect(onOpenDetails).toHaveBeenCalledTimes(2);
  });

  /* The ring, the 44px target and `align-self` moved with the control into
     `molecules/DetailsButton`, and its own test pins them there. Asserting them
     again here would pass against a file that no longer styles the button. The
     margin shorthand is not pinned anywhere any more, deliberately: it asserted
     a declaration rather than a behaviour, so `margin-inline` with an identical
     rendered result broke it, and it passed whether or not the rule reached the
     element (structural review, PR 233). */

  it('keeps no styles for the menu it replaced', () => {
    expect(css()).not.toMatch(/\.menuCorner\b/);
    expect(css()).not.toMatch(/\.more\b/);
  });
});

describe('what the row says is unchanged by the swap', () => {
  it('still leads with the booking, its status and its time', () => {
    row({ booking: sampleBookingFor({ status: 'completed', startsAt: at(-26), endsAt: at(-25) }) });
    expect(screen.getByText('School shortlist session with Amara Okafor')).toBeVisible();
    expect(screen.getByText('Completed')).toBeVisible();
    // 2026-10-02T10:00Z in Lagos, which is UTC+1.
    expect(screen.getByText(/11:00 am to 12:00 pm/)).toBeVisible();
  });

  it('the selected row keeps its ground, so the open panel has a source', () => {
    const { container } = row({ onOpenDetails: () => {}, selected: true });
    expect(container.firstElementChild).toHaveClass('row', 'selected');
    expect(rule('.selected')).toMatch(/background:\s*var\(--blue-50\)/);
  });
});

describe('what the row says (PRD Mentor Bookings)', () => {
  it('tags a past session with who canceled it', () => {
    row({ booking: sampleBookingFor({ status: 'cancelled', cancelledBy: 'mentee' }) });
    expect(screen.getByText('Canceled by Amara')).toBeVisible();
  });

  it('shows the clash line, with an id Accept can point at', () => {
    row({
      booking: sampleBookingFor({ status: 'pending', respondBy: at(20) }),
      overlap: { id: 'clash-b1', text: 'Overlaps your 9:00 am session with Tunde' },
    });
    expect(screen.getByText('Overlaps your 9:00 am session with Tunde')).toHaveAttribute(
      'id',
      'clash-b1',
    );
  });
});
