import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TimezonePicker } from './TimezonePicker';

// The dataset fails to load once (offline), then loads.
vi.mock('@/lib/vendor/tz/zoneData', async (orig) => {
  const real = await orig<typeof import('@/lib/vendor/tz/zoneData')>();
  return {
    loadZoneData: vi
      .fn()
      .mockRejectedValueOnce(new TypeError('offline'))
      .mockImplementation(real.loadZoneData),
  };
});

it('falls back to the browser’s list when the data fails, and tries again on the next open', async () => {
  render(<TimezonePicker value="Africa/Lagos" onChange={vi.fn()} deviceZone="Africa/Lagos" />);
  const change = screen.getByRole('button', { name: /Change time zone/ });
  await userEvent.click(change);
  const search = screen.getByRole('textbox', { name: 'Search time zones' });
  await userEvent.type(search, 'Accra');
  expect(await screen.findByRole('button', { name: /Accra \(GMT\)/ })).toBeInTheDocument();
  await userEvent.clear(search);
  await userEvent.type(search, 'Ghana');
  expect(screen.getByRole('status')).toHaveTextContent(
    'No zone matches that. Try a nearby big city.',
  );
  await userEvent.click(change);
  await userEvent.click(change);
  await userEvent.type(screen.getByRole('textbox', { name: 'Search time zones' }), 'Ghana');
  expect(
    await screen.findByRole('button', { name: /Accra \(GMT\)/ }, { timeout: 5000 }),
  ).toBeInTheDocument();
});
