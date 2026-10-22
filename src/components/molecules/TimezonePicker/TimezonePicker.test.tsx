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
    expect(screen.getByText(/^\d+\+? results?$/)).toBeInTheDocument();
    await userEvent.click(accra);
    expect(onChange).toHaveBeenCalledWith('Africa/Accra');
    expect(screen.queryByRole('list', { name: 'Time zones' })).toBeNull();
  });

  it('says when nothing matches', async () => {
    picker();
    await userEvent.click(screen.getByRole('button', { name: /Change time zone/ }));
    await userEvent.type(screen.getByRole('textbox', { name: 'Search time zones' }), 'zzzz');
    expect(
      await screen.findByText('No zone matches that. Try a nearby big city.'),
    ).toBeInTheDocument();
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
});
