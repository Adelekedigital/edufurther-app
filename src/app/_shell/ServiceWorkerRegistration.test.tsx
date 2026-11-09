import { render } from '@testing-library/react';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('@/lib/utils/serviceWorker', async (orig) => ({
  ...(await orig<typeof import('@/lib/utils/serviceWorker')>()),
  setUpServiceWorker: vi.fn(),
}));
const { ServiceWorkerRegistration } = await import('./ServiceWorkerRegistration');

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
