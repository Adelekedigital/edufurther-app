import { StrictMode } from 'react';
import { render } from '@testing-library/react';

const track = vi.hoisted(() => vi.fn());
vi.mock('@/lib/analytics/track', () => ({ track }));

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/lib/utils/serviceWorker', async (orig) => ({
  ...(await orig<typeof import('@/lib/utils/serviceWorker')>()),
  setUpServiceWorker: vi.fn(),
}));
const { ServiceWorkerRegistration } = await import('./ServiceWorkerRegistration');
const { resetInstallForTests } = await import('@/lib/analytics/install');

describe('ServiceWorkerRegistration: a tapped notification', () => {
  it('moves the app to the screen the worker names, with the app router', () => {
    const target = new EventTarget();
    Object.defineProperty(navigator, 'serviceWorker', {
      value: Object.assign(target, { startMessages: vi.fn() }),
      configurable: true,
    });
    const { unmount } = render(<ServiceWorkerRegistration />);
    const reply = { postMessage: vi.fn() };
    target.dispatchEvent(
      new MessageEvent('message', {
        data: { type: 'ef-open', url: '/messages?with=u2' },
        ports: [reply as unknown as MessagePort],
      }),
    );
    expect(push).toHaveBeenCalledWith('/messages?with=u2');
    expect(reply.postMessage).toHaveBeenCalledWith('opened');
    unmount();
    target.dispatchEvent(
      new MessageEvent('message', { data: { type: 'ef-open', url: '/sessions/s1' } }),
    );
    expect(push).toHaveBeenCalledTimes(1);
  });
});

describe('ServiceWorkerRegistration: pwa_installed (PRD 30)', () => {
  it('reports the install once per app start, under Strict Mode once in all, and no longer hears appinstalled', () => {
    track.mockClear();
    localStorage.clear();
    resetInstallForTests();
    window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as never;
    render(
      <StrictMode>
        <ServiceWorkerRegistration />
      </StrictMode>,
    );
    expect(track.mock.calls.map((c) => c.slice(0, 2))).toEqual([
      ['pwa_installed', { method: 'standalone_launch' }],
    ]);
    window.dispatchEvent(new Event('appinstalled'));
    expect(track).toHaveBeenCalledTimes(1);
  });
});
