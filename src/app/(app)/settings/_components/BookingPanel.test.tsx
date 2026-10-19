import { createRef } from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { MentorDefaults } from '@/lib/api/data/sessionTypes';
import type { AppError } from '@/types/mentor';
import { BookingPanel } from './BookingPanel';
import type { PanelHandle } from './ProfilePanel';

const stored: MentorDefaults = {
  durationMin: 60,
  noticeHours: 24,
  windowDays: 14,
  breakMin: null,
  requiresApproval: true,
  maxWindowDays: 56,
  platformWindowDays: 56,
  responseWindowHours: 12,
};

let defaults: {
  data: MentorDefaults | null;
  isLoading: boolean;
  error: AppError | null;
  retry: () => void;
  refreshing: boolean;
};
const save = vi.fn<(v: MentorDefaults) => Promise<MentorDefaults>>();
let saveError: AppError | null = null;

vi.mock('@/lib/api/data/sessionTypes', () => ({
  useMentorDefaults: () => defaults,
  useSaveMentorDefaults: () => ({
    save,
    isPending: false,
    error: saveError,
    reset: vi.fn(),
  }),
  useSessionsUsingRules: () => 2,
}));

beforeEach(() => {
  defaults = { data: stored, isLoading: false, error: null, retry: vi.fn(), refreshing: false };
  save.mockReset();
  save.mockImplementation(async (v) => v);
  saveError = null;
});

const bar = () => screen.queryByRole('region', { name: 'Unsaved changes' });

describe('BookingPanel', () => {
  it('shows what’s stored, an unset buffer as the platform’s, and no save bar', () => {
    render(<BookingPanel userId="u1" />);
    expect(screen.getByRole('switch', { name: 'Approve bookings' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect(screen.getByRole('combobox', { name: 'Session length' })).toHaveValue('60');
    expect(screen.getByRole('combobox', { name: 'Buffer between sessions' })).toHaveValue('0');
    expect(screen.getByText(/^2 of your sessions use these rules\./)).toBeInTheDocument();
    expect(screen.getByText(/respond by 12 hours before the session/)).toBeInTheDocument();
    expect(bar()).toBeNull();
  });

  it('a change raises the bar; Save writes approval and the four rules, then says so', async () => {
    const user = userEvent.setup();
    render(<BookingPanel userId="u1" />);
    await user.click(screen.getByRole('switch'));
    await user.selectOptions(screen.getByRole('combobox', { name: 'Session length' }), '90');
    expect(bar()).toHaveTextContent('Unsaved changes to booking rules');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(save).toHaveBeenCalledWith({
      requiresApproval: false,
      durationMin: 90,
      noticeHours: 24,
      windowDays: 14,
      breakMin: 0,
      maxWindowDays: 56,
      platformWindowDays: 56,
    });
    expect(await screen.findByText('Changes saved')).toBeInTheDocument();
    expect(bar()).toBeNull();
  });

  it('Discard puts back what’s saved', async () => {
    const user = userEvent.setup();
    render(<BookingPanel userId="u1" />);
    await user.click(screen.getByRole('switch'));
    await user.click(screen.getByRole('button', { name: 'Discard' }));
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
    expect(bar()).toBeNull();
  });

  it('a failed save keeps the edit and says so in our words', async () => {
    const user = userEvent.setup();
    saveError = { kind: 'server', message: 'x' } as AppError;
    save.mockRejectedValue(saveError);
    render(<BookingPanel userId="u1" />);
    await user.click(screen.getByRole('switch'));
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Your booking rules didn’t save.');
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'false');
  });

  it('the screen’s handle: dirty after an edit, and save() resolves true', async () => {
    const user = userEvent.setup();
    const ref = createRef<PanelHandle>();
    render(<BookingPanel ref={ref} userId="u1" />);
    expect(ref.current?.dirty()).toBe(false);
    await user.click(screen.getByRole('switch'));
    expect(ref.current?.dirty()).toBe(true);
    let ok = false;
    await act(async () => {
      ok = (await ref.current?.save()) ?? false;
    });
    expect(ok).toBe(true);
  });

  it('error before content: a failed load offers Try again', async () => {
    defaults = { ...defaults, data: null, error: { kind: 'offline', message: 'x' } as AppError };
    render(<BookingPanel userId="u1" />);
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(defaults.retry).toHaveBeenCalled();
  });

  it('loading: the skeleton', () => {
    defaults = { ...defaults, data: null, isLoading: true };
    render(<BookingPanel userId="u1" />);
    expect(screen.queryByRole('switch')).toBeNull();
  });
});
