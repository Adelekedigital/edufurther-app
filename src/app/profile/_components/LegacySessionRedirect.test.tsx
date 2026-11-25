import { render, screen } from '@testing-library/react';
import type { AppError, Remote } from '@/types/mentor';
import { LegacySessionRedirect } from './LegacySessionRedirect';

const h = vi.hoisted(() => ({
  replace: vi.fn(),
  found: null as unknown as Remote<string>,
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: h.replace }) }));
vi.mock('@/lib/api/data/legacySession', () => ({ useLegacySession: () => h.found }));

const remote = (over: Partial<Remote<string>>): Remote<string> => ({
  data: null,
  isLoading: false,
  error: null,
  retry: vi.fn(),
  ...over,
});
const err = (kind: AppError['kind']) => ({ kind }) as AppError;

beforeEach(() => h.replace.mockReset());

describe('LegacySessionRedirect', () => {
  it('found: opens the session page', () => {
    h.found = remote({ data: '0193a4c2-7d1e-7b3a-9f10-2c5e8d4b6a71' });
    render(<LegacySessionRedirect legacyId="1x1" />);
    expect(h.replace).toHaveBeenCalledWith('/sessions/0193a4c2-7d1e-7b3a-9f10-2c5e8d4b6a71');
  });

  it('loading: a busy page with a heading, no redirect yet', () => {
    h.found = remote({ isLoading: true });
    render(<LegacySessionRedirect legacyId="1x1" />);
    expect(screen.getByRole('heading', { name: 'Opening your session' })).toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveAttribute('aria-busy', 'true');
    expect(h.replace).not.toHaveBeenCalled();
  });

  it('not found (or not theirs): says so and offers Bookings', () => {
    h.found = remote({ error: err('notFound') });
    render(<LegacySessionRedirect legacyId="1x1" />);
    expect(
      screen.getByRole('heading', { name: 'We couldn’t find that session' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to Bookings' })).toHaveAttribute(
      'href',
      '/bookings',
    );
  });

  it('any other failure: a retry', () => {
    const retry = vi.fn();
    h.found = remote({ error: err('offline'), retry });
    render(<LegacySessionRedirect legacyId="1x1" />);
    screen.getByRole('button', { name: 'Try again' }).click();
    expect(retry).toHaveBeenCalled();
  });
});
