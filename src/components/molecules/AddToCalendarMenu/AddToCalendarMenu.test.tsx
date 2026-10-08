import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { CalendarEvent } from '@/lib/utils/calendarLinks';
import { AddToCalendarMenu } from './AddToCalendarMenu';

const download = vi.fn();
vi.mock('@/lib/utils/calendarLinks', async (orig) => ({
  ...(await orig<Record<string, unknown>>()),
  downloadIcs: (...a: unknown[]) => download(...a),
}));

const event: CalendarEvent = {
  id: 's1',
  title: '1:1 call with Amara Okafor',
  startsAt: '2026-10-04T17:00:00Z',
  endsAt: '2026-10-04T17:30:00Z',
  pageUrl: 'https://app.test/sessions/s1',
  venue: 'EduFurther video',
};

beforeEach(() => download.mockReset());

describe('AddToCalendarMenu', () => {
  it('is a menu button named by its visible words', () => {
    render(<AddToCalendarMenu event={event} />);
    const button = screen.getByRole('button', { name: 'Add to calendar' });
    expect(button).toHaveAttribute('aria-haspopup', 'menu');
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  it('offers Google, Outlook and a file for any other calendar', async () => {
    render(<AddToCalendarMenu event={event} />);
    await userEvent.click(screen.getByRole('button', { name: 'Add to calendar' }));
    expect(screen.getAllByRole('menuitem').map((el) => el.textContent)).toEqual([
      'open_in_newGoogle Calendar',
      'open_in_newOutlook.com',
      'downloadDownload for other calendars (.ics)',
    ]);
  });

  it('opens a web calendar in a new tab with the event filled in', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    render(<AddToCalendarMenu event={event} />);
    await userEvent.click(screen.getByRole('button', { name: 'Add to calendar' }));
    await userEvent.click(screen.getByRole('menuitem', { name: /Google Calendar/ }));
    const [url, target, features] = open.mock.calls[0]!;
    expect(String(url)).toMatch(/^https:\/\/calendar\.google\.com\/calendar\/render\?/);
    expect(target).toBe('_blank');
    expect(features).toBe('noopener,noreferrer');
    open.mockRestore();
  });

  it('downloads the .ics for any other calendar', async () => {
    render(<AddToCalendarMenu event={event} />);
    await userEvent.click(screen.getByRole('button', { name: 'Add to calendar' }));
    await userEvent.click(screen.getByRole('menuitem', { name: /other calendars/ }));
    expect(download).toHaveBeenCalledWith(event);
  });

  it('works from the keyboard, and Escape returns focus to the button', async () => {
    render(<AddToCalendarMenu event={event} />);
    const button = screen.getByRole('button', { name: 'Add to calendar' });
    button.focus();
    await userEvent.keyboard('{Enter}');
    // RowMenu focuses the first item on the next animation frame, after the
    // menu exists: wait for the focus, not just the element.
    const google = await screen.findByRole('menuitem', { name: /Google Calendar/ });
    await waitFor(() => expect(google).toHaveFocus());
    await userEvent.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: /Outlook/ })).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(button).toHaveFocus();
  });
});
