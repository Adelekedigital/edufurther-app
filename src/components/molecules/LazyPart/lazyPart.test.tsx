import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useRef, useState } from 'react';
import { LOAD_FAILED_COPY } from '@/lib/copy/loadFailed';
import { useFocusTrap } from '@/lib/utils/useFocusTrap';
import {
  clearLoadFailures,
  isChunkFailure,
  LazyPartFailures,
  lazyPart,
  page,
  RELOAD_KEY,
} from './lazyPart';

// The real next/dynamic, as the app router bundles it (vitest.setup makes it
// eager everywhere else, and plain `next/dynamic` here would be the pages
// router's, which draws a failed load as text): these tests drive a load that
// is still pending, and one that fails.
vi.mock('next/dynamic', async () => {
  const mod = (await import('next/dist/shared/lib/app-dynamic')) as { default: unknown };
  return { default: mod.default };
});

function TestDialog({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusTrap(ref, onClose);
  return (
    <div ref={ref} role="dialog" aria-label="Book">
      <button type="button" onClick={onClose}>
        Close
      </button>
    </div>
  );
}

function Screen({ Part }: { Part: (p: { onClose: () => void }) => React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [saved, setSaved] = useState(false);
  return (
    <main>
      <h1>Profile</h1>
      <textarea aria-label="Note" value={typed} onChange={(e) => setTyped(e.target.value)} />
      <button type="button" onClick={() => setOpen(true)}>
        Open
      </button>
      {/* Another task on the page, nothing to do with the part. */}
      <button type="button" onClick={() => setSaved(true)}>
        {saved ? 'Saved' : 'Save'}
      </button>
      {open && <Part onClose={() => setOpen(false)} />}
      <LazyPartFailures />
    </main>
  );
}

/** An always-on part (a tool in the page), with no way to close it. */
function Tool() {
  return <p>Cover tools</p>;
}

const chunkError = () =>
  Object.assign(new Error('Failed to load chunk /_next/static/chunks/x.js'), {
    name: 'ChunkLoadError',
  });

beforeEach(() => {
  sessionStorage.clear();
  vi.restoreAllMocks();
  clearLoadFailures();
});

describe('lazyPart', () => {
  it('while the code loads, the opener keeps focus; the part takes it on arrival and gives it back on close', async () => {
    const user = userEvent.setup();
    let arrive!: (c: typeof TestDialog) => void;
    const Part = lazyPart(() => new Promise<typeof TestDialog>((r) => (arrive = r)));
    render(<Screen Part={Part} />);
    const opener = screen.getByRole('button', { name: 'Open' });
    await user.click(opener);
    // Pending: the page is still drawn (no page-level suspense) and focus stays.
    expect(screen.getByRole('heading', { name: 'Profile' })).toBeVisible();
    expect(opener).toHaveFocus();
    expect(screen.queryByRole('dialog')).toBeNull();
    await act(async () => arrive(TestDialog));
    const dialog = await screen.findByRole('dialog');
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(dialog).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it('retries a failed load once, and then the part loads', async () => {
    const user = userEvent.setup();
    const load = vi.fn().mockRejectedValueOnce(new Error('blip')).mockResolvedValue(TestDialog);
    const Part = lazyPart(load);
    render(<Screen Part={Part} />);
    await user.click(screen.getByRole('button', { name: 'Open' }));
    expect(await screen.findByRole('dialog', {}, { timeout: 3000 })).toBeInTheDocument();
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('a part that never loads: the page and what was typed survive, and the toast offers a reload', async () => {
    const user = userEvent.setup();
    const reload = vi.spyOn(page, 'reload').mockImplementation(() => {});
    const Part = lazyPart<{ onClose: () => void }>(() => Promise.reject(new Error('boom')));
    render(<Screen Part={Part} />);
    await user.type(screen.getByRole('textbox', { name: 'Note' }), 'my draft');
    await user.click(screen.getByRole('button', { name: 'Open' }));
    expect(await screen.findByText(LOAD_FAILED_COPY.online, {}, { timeout: 3000 })).toBeVisible();
    expect(screen.getByRole('heading', { name: 'Profile' })).toBeVisible();
    expect(screen.getByRole('textbox', { name: 'Note' })).toHaveValue('my draft');
    // Not a missing file: no automatic reload, only the button's.
    expect(reload).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: LOAD_FAILED_COPY.reload }));
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('a missing file (a new deploy) reloads once, and never again inside the window', async () => {
    const user = userEvent.setup();
    const reload = vi.spyOn(page, 'reload').mockImplementation(() => {});
    const first = lazyPart<{ onClose: () => void }>(() => Promise.reject(chunkError()));
    const { unmount } = render(<Screen Part={first} />);
    await user.click(screen.getByRole('button', { name: 'Open' }));
    await waitFor(() => expect(reload).toHaveBeenCalledTimes(1), { timeout: 3000 });
    expect(sessionStorage.getItem(RELOAD_KEY)).not.toBeNull();
    // Reloading: nothing drawn in its place, and the page is still there.
    expect(screen.queryByText(LOAD_FAILED_COPY.online)).toBeNull();
    unmount();

    // The same failure again (the reload didn't help): the toast, no loop.
    const second = lazyPart<{ onClose: () => void }>(() => Promise.reject(chunkError()));
    render(<Screen Part={second} />);
    await user.click(screen.getByRole('button', { name: 'Open' }));
    expect(await screen.findByText(LOAD_FAILED_COPY.online, {}, { timeout: 3000 })).toBeVisible();
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('never reloads over unsaved typing', async () => {
    const user = userEvent.setup();
    const reload = vi.spyOn(page, 'reload').mockImplementation(() => {});
    const Part = lazyPart<{ onClose: () => void }>(() => Promise.reject(chunkError()));
    render(<Screen Part={Part} />);
    await user.type(screen.getByRole('textbox', { name: 'Note' }), 'half a message');
    await user.click(screen.getByRole('button', { name: 'Open' }));
    expect(await screen.findByText(LOAD_FAILED_COPY.online, {}, { timeout: 3000 })).toBeVisible();
    expect(reload).not.toHaveBeenCalled();
  });

  it('a failed dialog closes: other presses never open it or move focus; its opener, once back online, does (review of PR 606)', async () => {
    const user = userEvent.setup();
    // Both tries fail (offline), then the network is back.
    const load = vi
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue(TestDialog);
    const Part = lazyPart<{ onClose: () => void }>(load, { close: (p) => p.onClose() });
    render(<Screen Part={Part} />);
    const opener = screen.getByRole('button', { name: 'Open' });
    await user.click(opener);
    expect(await screen.findByText(LOAD_FAILED_COPY.online, {}, { timeout: 3000 })).toBeVisible();
    expect(screen.queryByText(LOAD_FAILED_COPY.inline)).toBeNull();
    // Closed through its parent: nothing is held open behind the page.
    expect(load).toHaveBeenCalledTimes(2);
    // Another task: the failed dialog stays shut and focus stays put.
    const save = screen.getByRole('button', { name: 'Save' });
    await user.click(save);
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('button', { name: 'Saved' })).toHaveFocus();
    expect(load).toHaveBeenCalledTimes(2);
    // Its own opener tries afresh, and it opens; the reload offer goes.
    await user.click(opener);
    expect(await screen.findByRole('dialog', {}, { timeout: 3000 })).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText(LOAD_FAILED_COPY.online)).toBeNull());
  });

  it('an always-on part says so in its place, and Try again loads it', async () => {
    const user = userEvent.setup();
    const load = vi
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue(Tool);
    const Part = lazyPart(load);
    render(
      <main>
        <Part />
        <LazyPartFailures />
      </main>,
    );
    expect(await screen.findByText(LOAD_FAILED_COPY.inline, {}, { timeout: 3000 })).toBeVisible();
    expect(screen.getByText(LOAD_FAILED_COPY.online)).toBeVisible();
    await user.click(screen.getByRole('button', { name: LOAD_FAILED_COPY.tryAgain }));
    expect(await screen.findByText('Cover tools')).toBeVisible();
    expect(screen.queryByText(LOAD_FAILED_COPY.inline)).toBeNull();
  });

  it('an onClose prop is not a way to close it: with no `close`, CoverPicker-like parts stay, say so, and Try again works (review of PR 606)', async () => {
    const user = userEvent.setup();
    // Like CoverPicker: always on while editing, and its onClose only clears messages.
    function Cover({ onClose }: { onClose: () => void }) {
      return (
        <button type="button" onClick={onClose}>
          Cover color
        </button>
      );
    }
    const clearMessages = vi.fn();
    const load = vi
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue(Cover);
    const Part = lazyPart<{ onClose: () => void }>(load);
    render(
      <main>
        <Part onClose={clearMessages} />
        <LazyPartFailures />
      </main>,
    );
    expect(await screen.findByText(LOAD_FAILED_COPY.inline, {}, { timeout: 3000 })).toBeVisible();
    expect(clearMessages).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: LOAD_FAILED_COPY.tryAgain }));
    expect(await screen.findByRole('button', { name: 'Cover color' })).toBeVisible();
    expect(clearMessages).not.toHaveBeenCalled();
  });

  it('knows a missing file from other failures', () => {
    expect(isChunkFailure(chunkError())).toBe(true);
    expect(
      isChunkFailure(new TypeError('Failed to fetch dynamically imported module: /x.js')),
    ).toBe(true);
    expect(isChunkFailure(new Error('boom'))).toBe(false);
    expect(isChunkFailure(null)).toBe(false);
  });
});
