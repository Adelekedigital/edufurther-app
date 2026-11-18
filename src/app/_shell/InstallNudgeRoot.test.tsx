import { act, fireEvent, render, screen } from '@testing-library/react';

const track = vi.hoisted(() => vi.fn());
vi.mock('@/lib/analytics/track', () => ({ track }));
const nav = vi.hoisted(() => ({ path: '/explore' }));
vi.mock('next/navigation', () => ({ usePathname: () => nav.path }));

import {
  NUDGE_KEY,
  noteInstallMoment,
  openInstallNudge,
  PHONE_QUERY,
  resetInstallNudgeForTests,
} from '@/lib/pwa/installNudge';
import { InstallNudgeRoot, leadFor, SHOW_DELAY_MS } from './InstallNudgeRoot';

const IOS_SAFARI =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';

function phone(ua: string) {
  window.matchMedia = vi.fn((q: string) => ({
    matches: q === PHONE_QUERY,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })) as never;
  Object.defineProperty(navigator, 'userAgent', { value: ua, configurable: true });
  Object.defineProperty(navigator, 'maxTouchPoints', { value: 5, configurable: true });
}

function offerPrompt() {
  const e = new Event('beforeinstallprompt', { cancelable: true }) as Event & {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: string }>;
  };
  e.prompt = vi.fn(() => Promise.resolve());
  e.userChoice = Promise.resolve({ outcome: 'accepted' });
  act(() => {
    window.dispatchEvent(e);
  });
  return e;
}

const wait = (ms = SHOW_DELAY_MS) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });

beforeEach(() => {
  vi.useFakeTimers();
  resetInstallNudgeForTests();
  track.mockReset();
  localStorage.clear();
  sessionStorage.clear();
  nav.path = '/explore';
  phone(IOS_SAFARI);
});
afterEach(() => {
  vi.useRealTimers();
});

describe('InstallNudgeRoot', () => {
  it('a booking: the sheet a beat later, as a labelled dialog with the booking’s line', () => {
    render(<InstallNudgeRoot />);
    act(() => noteInstallMoment({ trigger: 'booking', name: 'Ada' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    wait();
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
    wait(SHOW_DELAY_MS * 3);
    expect(screen.queryByRole('dialog', { name: 'EduFurther, one tap away' })).toBeNull();
    await act(async () => {
      modal.remove();
      await Promise.resolve(); // the MutationObserver's callback
    });
    wait();
    expect(screen.getByRole('dialog', { name: 'EduFurther, one tap away' })).toBeInTheDocument();
  });

  it('onboarding: never on the matches screen, on the next screen instead', () => {
    nav.path = '/onboarding/mentee';
    const { rerender } = render(<InstallNudgeRoot />);
    Object.defineProperty(window, 'location', {
      value: { ...window.location, pathname: '/onboarding/mentee' },
      configurable: true,
    });
    act(() => noteInstallMoment({ trigger: 'onboarding' }));
    wait(SHOW_DELAY_MS * 5);
    expect(screen.queryByRole('dialog')).toBeNull();
    nav.path = '/home';
    rerender(<InstallNudgeRoot />);
    wait();
    expect(screen.getByRole('dialog')).toHaveTextContent(
      'Your matches, messages and session reminders, one tap from your home screen.',
    );
  });

  it('iPhone: the three steps and the close, no other button', () => {
    render(<InstallNudgeRoot />);
    act(() => openInstallNudge());
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

  it('Android: the one reason and "Add to home screen", which calls the browser’s prompt', async () => {
    phone('Mozilla/5.0 (Linux; Android 14) Chrome/126.0 Mobile Safari/537.36');
    render(<InstallNudgeRoot />);
    const e = offerPrompt();
    act(() => openInstallNudge());
    expect(screen.getByRole('dialog')).toHaveTextContent(
      'Free, takes a few seconds, no app store.',
    );
    expect(screen.queryByRole('list')).toBeNull();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Add to home screen' }));
    });
    expect(e.prompt).toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('Escape, the backdrop and the close button are each a dismiss: rested and counted', () => {
    const dismissals = () => JSON.parse(localStorage.getItem(NUDGE_KEY)!).dismissed;
    render(<InstallNudgeRoot />);
    act(() => noteInstallMoment({ trigger: 'message', name: 'Ada' }));
    wait();
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
      localStorage.setItem(NUDGE_KEY, JSON.stringify({ dismissed: 0, restUntil: 0 }));
      act(() => noteInstallMoment({ trigger: 'booking' }));
      wait();
      close();
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(dismissals()).toBe(1);
    }
  });

  it('focus moves in, and goes back to what opened it', () => {
    const opener = document.createElement('button');
    document.body.appendChild(opener);
    opener.focus();
    render(<InstallNudgeRoot />);
    act(() => openInstallNudge());
    expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(document.activeElement).toBe(opener);
    opener.remove();
  });
});

describe('leadFor: the line by what happened', () => {
  const n = { platform: 'ios' as const, name: null, mentor: false };
  it('names the person, or falls back', () => {
    expect(leadFor({ ...n, trigger: 'booking', name: 'Ada' })).toBe(
      'Get a reminder before Ada’s session.',
    );
    expect(leadFor({ ...n, trigger: 'booking' })).toBe('Get a reminder before your session.');
    expect(leadFor({ ...n, trigger: 'message', name: 'Ada' })).toBe('Know the moment Ada replies.');
    expect(leadFor({ ...n, trigger: 'message' })).toBe('Know the moment your mentor replies.');
  });
  it('a mentor’s onboarding and the menu: no matches mentioned', () => {
    expect(leadFor({ ...n, trigger: 'onboarding', mentor: true })).toBe(
      'Your messages and session reminders, one tap from your home screen.',
    );
    expect(leadFor({ ...n, trigger: 'menu' })).toBe(
      'Your messages and session reminders, one tap from your home screen.',
    );
  });
});
