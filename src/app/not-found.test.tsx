import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ERROR_PAGE } from '@/lib/copy/errorPage';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: vi.fn(), push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => '/nowhere',
  useSearchParams: () => new URLSearchParams(),
}));

import NotFound from './not-found';

describe('not-found', () => {
  it('draws the 404 even with no query client: Next renders it without the root layout for an unknown server action', () => {
    render(<NotFound />);
    expect(screen.getByRole('heading', { name: ERROR_PAGE.notFound.title })).toBeInTheDocument();
  });

  it('inside the app (the usual case): uses the client already there, never a second one', () => {
    const client = new QueryClient();
    render(
      <QueryClientProvider client={client}>
        <NotFound />
      </QueryClientProvider>,
    );
    expect(screen.getByRole('heading', { name: ERROR_PAGE.notFound.title })).toBeInTheDocument();
    // The viewer's /me query lives in the app's client, not a stray one.
    expect(client.getQueryCache().getAll().length).toBeGreaterThan(0);
  });
});
