import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { CreditsView } from '@/lib/utils/credits';
import { CreditsExplainer } from './CreditsExplainer';

const credits: CreditsView = {
  refundHours: null,
  left: 4,
  monthlyLeft: 3,
  monthlyTotal: 3,
  bonus: [{ count: 1, expires: false, expiresOn: null }],
  showMonthly: true,
  level: 3,
  resetsOn: 'Nov 1',
};

const phone = (on: boolean) =>
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query: string) =>
      ({
        media: query,
        matches: on && query === '(max-width: 767px)',
        addEventListener: () => {},
        removeEventListener: () => {},
      }) as unknown as MediaQueryList,
  );

afterEach(() => vi.restoreAllMocks());

describe('CreditsExplainer', () => {
  it('phones: the shared BottomSheet, named "Your credits", with Close and "Got it"', async () => {
    phone(true);
    const onClose = vi.fn();
    render(<CreditsExplainer id="c" credits={credits} onClose={onClose} />);
    const sheet = screen.getByRole('dialog', { name: 'Your credits' });
    expect(within(sheet).getByRole('list', { name: 'Credits by type' })).toBeInTheDocument();
    // The sheet's own close, as on every BottomSheet, takes focus first.
    expect(within(sheet).getByRole('button', { name: 'Close' })).toHaveFocus();
    await userEvent.click(within(sheet).getByRole('button', { name: 'Got it' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('desktop: the popover under the pill, with no "Got it"', () => {
    phone(false);
    render(<CreditsExplainer id="c" credits={credits} onClose={vi.fn()} />);
    const panel = screen.getByRole('dialog', { name: 'Your credits' });
    expect(panel).toHaveFocus();
    expect(within(panel).queryByRole('button', { name: 'Got it' })).toBeNull();
    expect(within(panel).getByRole('link', { name: 'See my bookings' })).toBeInTheDocument();
  });
});
