import { StrictMode } from 'react';
import { render } from '@testing-library/react';
import { useOnLeave } from './useOnLeave';

function Leaving({ onLeave }: { onLeave: () => void }) {
  useOnLeave(onLeave);
  return null;
}
const settle = () => new Promise<void>((r) => setTimeout(r, 0));

describe('useOnLeave', () => {
  it('runs once on a real unmount, never for StrictMode’s remount', async () => {
    const onLeave = vi.fn();
    const { unmount } = render(
      <StrictMode>
        <Leaving onLeave={onLeave} />
      </StrictMode>,
    );
    await settle();
    expect(onLeave).not.toHaveBeenCalled();
    unmount();
    await settle();
    expect(onLeave).toHaveBeenCalledTimes(1);
  });

  it('runs on a page hide, and not again on the unmount after it', async () => {
    const onLeave = vi.fn();
    const { unmount } = render(<Leaving onLeave={onLeave} />);
    window.dispatchEvent(new Event('pagehide'));
    expect(onLeave).toHaveBeenCalledTimes(1);
    unmount();
    await settle();
    expect(onLeave).toHaveBeenCalledTimes(1);
  });

  it('reads the latest render', async () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender, unmount } = render(<Leaving onLeave={first} />);
    rerender(<Leaving onLeave={second} />);
    unmount();
    await settle();
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('a page back from the back/forward cache can leave again', async () => {
    const onLeave = vi.fn();
    const { unmount } = render(<Leaving onLeave={onLeave} />);
    window.dispatchEvent(new Event('pagehide'));
    const restored = new Event('pageshow') as PageTransitionEvent;
    Object.defineProperty(restored, 'persisted', { value: true });
    window.dispatchEvent(restored);
    unmount();
    await settle();
    expect(onLeave).toHaveBeenCalledTimes(2);
  });

  it('an ordinary page show (not from the cache) changes nothing', async () => {
    const onLeave = vi.fn();
    const { unmount } = render(<Leaving onLeave={onLeave} />);
    window.dispatchEvent(new Event('pagehide'));
    const shown = new Event('pageshow') as PageTransitionEvent;
    Object.defineProperty(shown, 'persisted', { value: false });
    window.dispatchEvent(shown);
    unmount();
    await settle();
    expect(onLeave).toHaveBeenCalledTimes(1);
  });
});
