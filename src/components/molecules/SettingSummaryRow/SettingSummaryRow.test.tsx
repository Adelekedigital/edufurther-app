import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { SettingSummaryRow } from './SettingSummaryRow';

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

const row = (props: Partial<Parameters<typeof SettingSummaryRow>[0]> = {}) => (
  <SettingSummaryRow
    icon="date_range"
    title="Booking rules"
    summary="Confirmed straight away · 60 min"
    actionLabel="Edit booking rules"
    onChange={vi.fn()}
    {...props}
  />
);

describe('SettingSummaryRow', () => {
  it('desktop: a "Change" button named for what it changes', () => {
    phone(false);
    render(row());
    expect(screen.getByRole('button', { name: 'Edit booking rules' })).toHaveTextContent('Change');
  });

  it('phones: one edit icon in its place, holding the ref and the click', async () => {
    phone(true);
    const onChange = vi.fn();
    const ref = createRef<HTMLButtonElement>();
    render(<SettingSummaryRow {...row({ onChange }).props} ref={ref} />);
    const edit = screen.getByRole('button', { name: 'Edit booking rules' });
    expect(edit).not.toHaveTextContent('Change');
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(ref.current).toBe(edit);
    await userEvent.click(edit);
    expect(onChange).toHaveBeenCalled();
  });

  it('phones: a row with its own action keeps its button', () => {
    phone(true);
    render(row({ actionText: 'Try again', actionLabel: 'Try loading your video setting again' }));
    expect(
      screen.getByRole('button', { name: 'Try loading your video setting again' }),
    ).toHaveTextContent('Try again');
  });

  it('phones: a busy edit icon says so and takes no second tap', () => {
    phone(true);
    render(row({ busy: true }));
    const edit = screen.getByRole('button', { name: 'Edit booking rules' });
    expect(edit).toBeDisabled();
    expect(edit).toHaveAttribute('aria-busy', 'true');
  });
});
