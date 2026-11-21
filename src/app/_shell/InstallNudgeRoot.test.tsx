import { act, fireEvent, render, screen } from '@testing-library/react';

const track = vi.hoisted(() => vi.fn());
vi.mock('@/lib/analytics/track', () => ({ track }));

import { device, offerPrompt as offer, UA } from '@/lib/pwa/_test/installHarness';
import {
  NUDGE_KEY,
  PENDING_MS,
  resetInstallNudgeForTests,
  SHOW_DELAY_MS,
} from '@/lib/pwa/installNudge';
import {
  noteInstallMoment,
  openInstallNudge,
  PENDING_KEY,
  resetInstallPromptForTests,
  resumeInstallMoment,
} from '@/lib/pwa/installPrompt';
import { InstallNudgeRoot } from './InstallNudgeRoot';
import { leadFor } from './InstallNudgeSheet';

const phone = (ua: string) => device({ ua });
const IOS_SAFARI = UA.iosSafari;

function offerPrompt() {
  let e!: ReturnType<typeof offer>;
  act(() => {
    e = offer();
  });
  return e;
}

/** The lazy half loads and decides, then the delay, then the sheet. */
const wait = async (ms = SHOW_DELAY_MS) => {
  await act(async () => {
    await vi.dynamicImportSettled();
  });
  act(() => {
    vi.advanceTimersByTime(ms);
  });
  await act(async () => {
    await vi.dynamicImportSettled();
  });
};

/** The More menu's item: its code loads, then the sheet opens. */
const openMenu = () =>
  act(async () => {
    await openInstallNudge();
  });

beforeEach(() => {
  vi.useFakeTimers();
  resetInstallNudgeForTests();
  resetInstallPromptForTests();
  track.mockReset();
  localStorage.clear();
  sessionStorage.clear();
  phone(IOS_SAFARI);
});
afterEach(() => {
  vi.useRealTimers();
});

describe('InstallNudgeRoot', () => {
  it('a booking: the sheet a beat later, as a labelled dialog with the booking’s line', async () => {
    render(<InstallNudgeRoot />);
    act(() => noteInstallMoment({ trigger: 'booking', name: 'Ada' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    await wait();
    const dialog = screen.getByRole('dialog', { name: 'EduFurther, one tap away' });
    expect(dialog).toHaveTextContent('Get a reminder before Ada’s session.');
    expect(track).toHaveBeenCalledWith('install_nudge_shown', {
      trigger: 'booking',
      platform: 'ios',
    });
  });

  it('waits while another dialog is open (the booking modal), then shows', async () => {
    const modal = document.createElement('div');
    modal.setAttribute('aria-modal', 'true');
    document.body.appendChild(modal);
    render(<InstallNudgeRoot />);
    act(() => noteInstallMoment({ trigger: 'booking', name: 'Ada' }));
    await wait(SHOW_DELAY_MS * 3);
    expect(screen.queryByRole('dialog', { name: 'EduFurther, one tap away' })).toBeNull();
    await act(async () => {
      modal.remove();
      await Promise.resolve(); // the MutationObserver's callback
    });
    await wait();
    expect(screen.getByRole('dialog', { name: 'EduFurther, one tap away' })).toBeInTheDocument();
  });

  it('onboarding: never on the matches screen, on the next screen instead', async () => {
    const at = (pathname: string) =>
      Object.defineProperty(window, 'location', {
        value: { ...window.location, pathname },
        configurable: true,
      });
    at('/onboarding/mentee');
    render(<InstallNudgeRoot />);
    act(() => noteInstallMoment({ trigger: 'onboarding' }));
    await wait(SHOW_DELAY_MS * 5);
    expect(screen.queryByRole('dialog')).toBeNull();
    // The next screen: a new path, and the page's DOM changes with it.
    at('/home');
    act(() => {
      document.body.appendChild(document.createElement('main'));
    });
    await wait();
    expect(screen.getByRole('dialog')).toHaveTextContent(
      'Your matches, messages and session reminders, one tap from your home screen.',
    );
  });

  it('iPhone: the three steps and the close, no other button', async () => {
    render(<InstallNudgeRoot />);
    await openMenu();
    const steps = screen.getAllByRole('listitem').map((li) => li.textContent?.replace(/\s+/g, ' '));
    expect(steps).toEqual([
      '1Tap Share ios_share in Safari’s toolbar',
      '2Choose Add to Home Screen',
      '3Open EduFurther from your home screen',
    ]);
    expect(
      screen.getAllByRole('button').map((b) => b.getAttribute('aria-label') ?? b.textContent),
    ).toEqual(['Close']);
    expect(screen.getByRole('dialog')).not.toHaveTextContent('no app store');
  });

  it('Android: the one reason and "Install the app", which calls the browser’s prompt', async () => {
    phone('Mozilla/5.0 (Linux; Android 14) Chrome/126.0 Mobile Safari/537.36');
    render(<InstallNudgeRoot />);
    const e = offerPrompt();
    await openMenu();
    expect(screen.getByRole('dialog')).toHaveTextContent(
      'Free, takes a few seconds, no app store.',
    );
    expect(screen.queryByRole('list')).toBeNull();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Install the app' }));
    });
    expect(e.prompt).toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('Escape, the backdrop and the close button are each a dismiss: rested and counted', async () => {
    const dismissals = () => JSON.parse(localStorage.getItem(NUDGE_KEY)!).dismissed;
    render(<InstallNudgeRoot />);
    act(() => noteInstallMoment({ trigger: 'message', name: 'Ada' }));
    await wait();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(dismissals()).toBe(1);
    expect(track).toHaveBeenLastCalledWith('install_nudge_dismissed', {
      trigger: 'message',
      platform: 'ios',
      how: 'closed',
    });
    for (const close of [
      () => fireEvent.click(screen.getByRole('button', { name: 'Close' })),
      () => fireEvent.click(document.querySelector('[aria-hidden="true"][class*="overlay"]')!),
    ]) {
      sessionStorage.clear();
      resetInstallNudgeForTests();
      resetInstallPromptForTests();
      localStorage.setItem(NUDGE_KEY, JSON.stringify({ dismissed: 0, restUntil: 0 }));
      act(() => noteInstallMoment({ trigger: 'booking' }));
      await wait();
      close();
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(dismissals()).toBe(1);
    }
  });

  it('focus moves in, and goes back to what opened it', async () => {
    const opener = document.createElement('button');
    document.body.appendChild(opener);
    opener.focus();
    render(<InstallNudgeRoot />);
    await openMenu();
    expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });
});

/** This tab at another path (onboarding's moment waits for the next screen). */
const at = (pathname: string) =>
  Object.defineProperty(window, 'location', {
    value: { ...window.location, pathname },
    configurable: true,
  });

/**
 * A full page load: the modules start again (their memory is gone), the tab's
 * storage stays, and the eager core looks for a kept moment as it loads.
 */
function pageLoad() {
  resetInstallNudgeForTests();
  resetInstallPromptForTests();
  act(() => resumeInstallMoment());
}

const SHEET = { name: 'EduFurther, one tap away' };

describe('a page load between the moment and its screen (staging, 2026-11-18)', () => {
  afterEach(() => at('/'));

  it('booking: the modal still open, then a page load: the sheet once the modal is gone', async () => {
    const modal = document.createElement('div');
    modal.setAttribute('aria-modal', 'true');
    document.body.appendChild(modal);
    const { unmount } = render(<InstallNudgeRoot />);
    act(() => noteInstallMoment({ trigger: 'booking', name: 'Ada' }));
    await wait();
    expect(screen.queryByRole('dialog', SHEET)).toBeNull();
    unmount();
    modal.remove();
    pageLoad();
    render(<InstallNudgeRoot />);
    await wait();
    // No name survives the load (the tab may be someone else's by then).
    expect(screen.getByRole('dialog', SHEET)).toHaveTextContent(
      'Get a reminder before your session.',
    );
    expect(sessionStorage.getItem(PENDING_KEY)).toBeNull();
  });

  it('first message: the chat opened with a page load: the sheet there', async () => {
    const modal = document.createElement('div');
    modal.setAttribute('aria-modal', 'true');
    document.body.appendChild(modal);
    const { unmount } = render(<InstallNudgeRoot />);
    act(() => noteInstallMoment({ trigger: 'message', name: 'Ada' }));
    await wait();
    unmount();
    modal.remove();
    pageLoad();
    render(<InstallNudgeRoot />);
    await wait();
    expect(screen.getByRole('dialog', SHEET)).toHaveTextContent('Know the moment they reply.');
  });

  it('onboarding: a page load onto the next screen still brings it, never on the matches', async () => {
    at('/onboarding/mentee');
    const { unmount } = render(<InstallNudgeRoot />);
    act(() => noteInstallMoment({ trigger: 'onboarding' }));
    await wait(SHOW_DELAY_MS * 3);
    expect(screen.queryByRole('dialog')).toBeNull();
    unmount();
    // Reloaded on the matches: still not there.
    pageLoad();
    const again = render(<InstallNudgeRoot />);
    await wait(SHOW_DELAY_MS * 3);
    expect(screen.queryByRole('dialog')).toBeNull();
    again.unmount();
    at('/home');
    pageLoad();
    render(<InstallNudgeRoot />);
    await wait();
    expect(screen.getByRole('dialog', SHEET)).toHaveTextContent(
      'Your matches, messages and session reminders, one tap from your home screen.',
    );
  });

  it('Android: after the load the sheet waits for the page’s own prompt', async () => {
    phone(UA.android);
    offerPrompt();
    at('/onboarding/mentee');
    const { unmount } = render(<InstallNudgeRoot />);
    act(() => noteInstallMoment({ trigger: 'onboarding' }));
    await wait();
    unmount();
    at('/home');
    pageLoad();
    render(<InstallNudgeRoot />);
    await wait();
    expect(screen.queryByRole('dialog')).toBeNull();
    const e = offerPrompt();
    await wait();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Install the app' }));
    });
    expect(e.prompt).toHaveBeenCalled();
  });

  it(`a kept moment older than ${PENDING_MS / 60_000} minutes is dropped`, async () => {
    at('/onboarding/mentee');
    act(() => noteInstallMoment({ trigger: 'onboarding' }));
    await wait();
    vi.advanceTimersByTime(PENDING_MS);
    at('/home');
    pageLoad();
    render(<InstallNudgeRoot />);
    await wait();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(sessionStorage.getItem(PENDING_KEY)).toBeNull();
  });

  it('once a visit still holds: shown before the load, nothing kept after it', async () => {
    render(<InstallNudgeRoot />);
    act(() => noteInstallMoment({ trigger: 'booking' }));
    await wait();
    expect(screen.getByRole('dialog', SHEET)).toBeInTheDocument();
    expect(sessionStorage.getItem(PENDING_KEY)).toBeNull();
  });

  it('a garbled or foreign record is dropped, not shown', async () => {
    sessionStorage.setItem(
      PENDING_KEY,
      JSON.stringify({ trigger: 'menu', from: '/', at: Date.now() }),
    );
    pageLoad();
    render(<InstallNudgeRoot />);
    await wait();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(sessionStorage.getItem(PENDING_KEY)).toBeNull();
  });
});

describe('leadFor: the line by what happened', () => {
  const n = { platform: 'ios' as const, name: null, mentor: false };
  it('names the person, or falls back', async () => {
    expect(leadFor({ ...n, trigger: 'booking', name: 'Ada' })).toBe(
      'Get a reminder before Ada’s session.',
    );
    expect(leadFor({ ...n, trigger: 'booking' })).toBe('Get a reminder before your session.');
    expect(leadFor({ ...n, trigger: 'message', name: 'Ada' })).toBe('Know the moment Ada replies.');
    expect(leadFor({ ...n, trigger: 'message' })).toBe('Know the moment they reply.');
  });
  it('a mentor’s onboarding and the menu: no matches mentioned', async () => {
    expect(leadFor({ ...n, trigger: 'onboarding', mentor: true })).toBe(
      'Your messages and session reminders, one tap from your home screen.',
    );
    expect(leadFor({ ...n, trigger: 'menu' })).toBe(
      'Your messages and session reminders, one tap from your home screen.',
    );
  });
});
