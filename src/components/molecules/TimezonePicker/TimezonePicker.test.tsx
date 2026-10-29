import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { loadZoneData } from '@/lib/vendor/tz/zoneData';
import { TimezonePicker } from './TimezonePicker';

// The dataset is big: load it once up front so no test waits on the first import.
beforeAll(() => loadZoneData(), 30_000);

const picker = (over: Partial<Parameters<typeof TimezonePicker>[0]> = {}) => {
  const onChange = vi.fn();
  render(
    <TimezonePicker value="Africa/Lagos" onChange={onChange} deviceZone="Africa/Lagos" {...over} />,
  );
  return onChange;
};

describe('TimezonePicker', () => {
  it('reads "Times shown in Lagos (WAT) · Change", one name for the button', () => {
    picker();
    expect(screen.getByText('Lagos (WAT)')).toBeInTheDocument();
    const change = screen.getByRole('button', { name: 'Change time zone, now Lagos (WAT)' });
    expect(change).toHaveTextContent(/^Change$/);
  });

  it('darkens its line only when asked to sit on a tinted ground (onTint)', () => {
    const { unmount } = render(
      <TimezonePicker value="Africa/Lagos" onChange={vi.fn()} deviceZone="Africa/Lagos" />,
    );
    const wrapOf = () => screen.getByText('Lagos (WAT)').parentElement!;
    expect(wrapOf()).not.toHaveClass('onTint');
    unmount();
    picker({ onTint: true });
    expect(wrapOf()).toHaveClass('wrap', 'onTint');
  });

  it('opens on common zones, with the device shortcut when it differs', async () => {
    picker({ deviceZone: 'Europe/London' });
    await userEvent.click(screen.getByRole('button', { name: /Change time zone/ }));
    expect(screen.getByText('Common zones · search for any city')).toBeInTheDocument();
    const list = screen.getByRole('list', { name: 'Time zones' });
    for (const name of [/Lagos \(WAT\)/, /Accra \(GMT\)/, /Douala \(WAT\)/, /Toronto/])
      expect(within(list).getByRole('button', { name })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Use my device’s zone (London (UK))' }),
    ).toBeInTheDocument();
  });

  it('finds a zone by country once the data loads, and picks it', async () => {
    const onChange = picker();
    await userEvent.click(screen.getByRole('button', { name: /Change time zone/ }));
    await userEvent.type(screen.getByRole('textbox', { name: 'Search time zones' }), 'Ghana');
    const accra = await screen.findByRole('button', { name: /Accra \(GMT\)/ }, { timeout: 5000 });
    expect(screen.getByRole('status')).toHaveTextContent(/^\d+\+? results?$/);
    await userEvent.click(accra);
    expect(onChange).toHaveBeenCalledWith('Africa/Accra');
    expect(screen.queryByRole('list', { name: 'Time zones' })).toBeNull();
  });

  it('announces the result count through a region that mounts empty', async () => {
    picker();
    expect(screen.queryByRole('status')).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: /Change time zone/ }));
    const status = screen.getByRole('status');
    expect(status).toBeEmptyDOMElement();
    await userEvent.type(screen.getByRole('textbox', { name: 'Search time zones' }), 'zzzz');
    expect(status).toHaveTextContent('No zone matches that. Try a nearby big city.');
  });

  it('a second search with the same result is announced again (review of PR 379)', async () => {
    picker();
    await userEvent.click(screen.getByRole('button', { name: /Change time zone/ }));
    const status = screen.getByRole('status');
    const box = screen.getByRole('textbox', { name: 'Search time zones' });
    await userEvent.type(box, 'zzzz');
    const first = status.firstElementChild;
    // Typing on: the field never empties, so only a new id re-reads the words.
    await userEvent.type(box, 'q');
    // Same words, a new node: screen readers read a replaced node again.
    expect(status).toHaveTextContent('No zone matches that. Try a nearby big city.');
    expect(status.firstElementChild).not.toBe(first);
  });

  it('a click outside closes it without pulling focus back to Change (review of PR 380)', async () => {
    picker();
    const change = screen.getByRole('button', { name: /Change time zone/ });
    await userEvent.click(change);
    const backdrop = document.querySelector('[class*="backdrop"]') as HTMLElement;
    await userEvent.click(backdrop);
    expect(screen.queryByRole('textbox', { name: 'Search time zones' })).toBeNull();
    expect(document.activeElement).not.toBe(change);
  });

  it('says when nothing matches', async () => {
    picker();
    await userEvent.click(screen.getByRole('button', { name: /Change time zone/ }));
    await userEvent.type(screen.getByRole('textbox', { name: 'Search time zones' }), 'zzzz');
    // Said on screen and in the status region.
    expect(await screen.findAllByText('No zone matches that. Try a nearby big city.')).toHaveLength(
      2,
    );
  });

  it('arrow keys move through the rows; Escape closes and returns focus to Change', async () => {
    picker();
    const change = screen.getByRole('button', { name: /Change time zone/ });
    await userEvent.click(change);
    await userEvent.keyboard('{ArrowDown}');
    const rows = within(screen.getByRole('list', { name: 'Time zones' })).getAllByRole('button');
    expect(document.activeElement).toBe(rows[0]);
    await userEvent.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(rows[1]);
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(document.activeElement).toBe(change));
    expect(screen.queryByRole('list', { name: 'Time zones' })).toBeNull();
  });

  it('shows a saved alias as its canonical zone', async () => {
    picker({ value: 'Asia/Calcutta' });
    await userEvent.click(screen.getByRole('button', { name: /Change time zone/ }));
    expect(
      // The dataset loads on first open; give it more than the default second.
      await screen.findByRole(
        'button',
        { name: /India \(IST\)/, current: true },
        { timeout: 5000 },
      ),
    ).toBeInTheDocument();
  });

  it('Up from the first row goes back to the search field', async () => {
    picker();
    await userEvent.click(screen.getByRole('button', { name: /Change time zone/ }));
    const search = screen.getByRole('textbox', { name: 'Search time zones' });
    await userEvent.keyboard('{ArrowDown}');
    await userEvent.keyboard('{ArrowUp}');
    expect(document.activeElement).toBe(search);
  });

  it('a device zone browsers report by its old name isn’t offered as different', async () => {
    picker({ value: 'Asia/Kolkata', deviceZone: 'Asia/Calcutta' });
    await userEvent.click(screen.getByRole('button', { name: /Change time zone/ }));
    expect(screen.queryByRole('button', { name: /Use my device’s zone/ })).toBeNull();
  });

  it('UTC can be seen and picked once the data has loaded', async () => {
    const onChange = picker({ value: 'UTC' });
    await userEvent.click(screen.getByRole('button', { name: /Change time zone/ }));
    expect(
      await screen.findByRole('button', { name: /^UTC/, current: true }, { timeout: 5000 }),
    ).toBeInTheDocument();
    await userEvent.type(screen.getByRole('textbox', { name: 'Search time zones' }), 'utc');
    await userEvent.click(await screen.findByRole('button', { name: /^UTC/ }));
    expect(onChange).toHaveBeenCalledWith('UTC');
  });

  it('on a phone it is a dialog that keeps focus and returns it to Change', async () => {
    const mq = vi.spyOn(window, 'matchMedia').mockImplementation(
      (query) =>
        ({
          matches: query.includes('max-width: 767px'),
          media: query,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          addListener: vi.fn(),
          removeListener: vi.fn(),
          onchange: null,
          dispatchEvent: vi.fn(),
        }) as unknown as MediaQueryList,
    );
    picker();
    const change = screen.getByRole('button', { name: /Change time zone/ });
    await userEvent.click(change);
    expect(screen.getByRole('dialog', { name: 'Time zone' })).toHaveAttribute('aria-modal', 'true');
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(document.activeElement).toBe(change));
    // A tap on the scrim closes it too, and focus still comes back to Change.
    await userEvent.click(change);
    const scrim = document.querySelector<HTMLElement>('[class*="backdrop"]')!;
    await userEvent.click(scrim);
    expect(screen.queryByRole('dialog', { name: 'Time zone' })).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(change));
    mq.mockRestore();
  });
});
