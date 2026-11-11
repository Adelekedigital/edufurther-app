import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Viewer } from '@/types/mentor';
import { viewers } from '@/test-utils/roles';

const h = vi.hoisted(() => ({
  viewer: { kind: 'guest' } as Viewer,
  report: vi.fn((_e: unknown): string | null => 'EF-7Q2K9X'),
}));
vi.mock('@/lib/api/data/viewer', () => ({ useViewer: () => h.viewer }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ back: vi.fn(), push: vi.fn() }) }));
vi.mock('@/lib/vendor/errors', () => ({
  reportErrorOnce: (e: unknown) => h.report(e),
}));

import { ErrorScreen, RouteError } from './ErrorScreen';

beforeEach(() => {
  h.viewer = { kind: 'guest' } as Viewer;
  h.report.mockClear();
});

describe('ErrorScreen: the actions follow who is looking', () => {
  it('404 signed out: Go to EduFurther and Go back', () => {
    render(<ErrorScreen type="notFound" />);
    expect(screen.getByRole('link', { name: 'Go to EduFurther' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('button', { name: 'Go back' })).toBeInTheDocument();
  });

  it('404 a mentee: Go to Home and Find a mentor', () => {
    h.viewer = viewers.menteeFinished;
    render(<ErrorScreen type="notFound" />);
    expect(screen.getByRole('link', { name: 'Go to Home' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Find a mentor' })).toHaveAttribute('href', '/explore');
  });

  it('404 a mentor: Go to Home and Go back (booking is for mentees)', () => {
    h.viewer = viewers.mentorApproved;
    render(<ErrorScreen type="notFound" />);
    expect(screen.getByRole('link', { name: 'Go to Home' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Find a mentor' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Go back' })).toBeInTheDocument();
  });

  it('while the viewer loads: the signed-out labels, never a guessed role', () => {
    h.viewer = { kind: 'loading' } as Viewer;
    render(<ErrorScreen type="notFound" />);
    expect(screen.getByRole('link', { name: 'Go to EduFurther' })).toBeInTheDocument();
  });
});

describe('RouteError: a route’s crash', () => {
  it('reports the error once, quotes the reference, and Try again re-renders the route', async () => {
    h.viewer = viewers.menteeFinished;
    const reset = vi.fn();
    const err = new Error('boom');
    const { rerender } = render(<RouteError error={err} reset={reset} />);
    expect(await screen.findByText(/quote EF-7Q2K9X\./)).toBeInTheDocument();
    rerender(<RouteError error={err} reset={reset} />);
    // Once per error is the seam's job (reportErrorOnce, its own test): the page asks with this error.
    expect(h.report).toHaveBeenCalledWith(err);
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(reset).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('link', { name: 'Go to Home' })).toHaveAttribute('href', '/');
  });

  it('error tracking off: no reference to quote', async () => {
    h.report.mockReturnValueOnce(null);
    render(<RouteError error={new Error('boom')} reset={vi.fn()} />);
    expect(await screen.findByText(/If it keeps happening, tell us/)).toBeInTheDocument();
    expect(screen.queryByText(/quote/)).toBeNull();
  });
});
