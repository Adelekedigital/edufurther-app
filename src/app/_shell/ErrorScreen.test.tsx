import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Viewer } from '@/types/mentor';
import { viewers } from '@/test-utils/roles';

const h = vi.hoisted(() => ({
  viewer: { kind: 'guest' } as Viewer,
  report: vi.fn((_e: unknown): Promise<string | null> => Promise.resolve('EF-7Q2K9X')),
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

  it('while the viewer loads: no role-specific action, Home labelled by the session alone', () => {
    h.viewer = { kind: 'loading', signedIn: true };
    render(<ErrorScreen type="notFound" />);
    expect(screen.getByRole('link', { name: 'Go to Home' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Find a mentor' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Go back' })).toBeNull();
  });

  it('inside the shell it is a section; outside, the page’s own main#main (one main per page)', () => {
    const { unmount } = render(<ErrorScreen type="notFound" />);
    expect(screen.queryByRole('main')).toBeNull();
    unmount();
    render(<ErrorScreen type="notFound" landmark />);
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main');
  });
});

describe('RouteError: a route’s crash', () => {
  it('quotes the reference once sent, and Try again asks for the route’s data again (retry)', async () => {
    h.viewer = viewers.menteeFinished;
    const reset = vi.fn();
    const retry = vi.fn();
    const err = new Error('boom');
    render(<RouteError error={err} reset={reset} retry={retry} />);
    expect(await screen.findByText(/and quote EF-7Q2K9X\./)).toBeInTheDocument();
    expect(h.report).toHaveBeenCalledWith(err);
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalledTimes(1);
    expect(reset).not.toHaveBeenCalled();
    expect(screen.getByRole('link', { name: 'Go to Home' })).toHaveAttribute('href', '/');
  });

  it('without retry (older Next), Try again re-renders (reset)', async () => {
    const reset = vi.fn();
    render(<RouteError error={new Error('boom')} reset={reset} />);
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it('nothing sent (tracking off, blocked or offline): no reference to quote', async () => {
    h.report.mockReturnValueOnce(Promise.resolve(null));
    render(<RouteError error={new Error('boom')} reset={vi.fn()} />);
    expect(await screen.findByText(/If it keeps happening, email/)).toBeInTheDocument();
    expect(screen.queryByText(/quote/)).toBeNull();
  });

  it('focus goes to the page heading: the control the person was on went with the crash', async () => {
    render(
      <main id="main">
        <RouteError error={new Error('boom')} reset={vi.fn()} />
      </main>,
    );
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Something went wrong on our side' }),
    ).toHaveFocus();
  });
});
