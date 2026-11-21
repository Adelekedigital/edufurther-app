const track = vi.hoisted(() => vi.fn());
vi.mock('@/lib/analytics/track', () => ({ track }));

import { DAY, device, offerPrompt, UA } from './_test/installHarness';
import {
  acceptInstall,
  admit,
  closeInstall,
  installNudgeBusy,
  MAX_DISMISSALS,
  mayAutoShow,
  notePushAskShown,
  NUDGE_KEY,
  openFromMenu,
  REST_DAYS,
  resetInstallNudgeForTests,
  SHOWN_KEY,
  showPending,
} from './installNudge';
import { captureInstallPrompt, installPlatform, resetInstallPromptForTests } from './installPrompt';

/** A moment, as installPrompt hands it over once this half has loaded. */
const noteInstallMoment = (m: Parameters<typeof admit>[0]) => admit(m, '/here');

let stop: () => void;
beforeEach(() => {
  resetInstallNudgeForTests();
  resetInstallPromptForTests();
  track.mockReset();
  localStorage.clear();
  sessionStorage.clear();
  device();
  stop = captureInstallPrompt();
});
afterEach(() => {
  stop();
  vi.restoreAllMocks();
});

const events = () => track.mock.calls.map((c) => [c[0], c[1]]);

describe('how often it shows by itself', () => {
  beforeEach(() => {
    offerPrompt();
  });

  it('once per visit', () => {
    noteInstallMoment({ trigger: 'booking', name: 'Ada' });
    expect(showPending()).toBe(true);
    closeInstall();
    noteInstallMoment({ trigger: 'message', name: 'Ada' });
    expect(showPending()).toBe(false);
    expect(sessionStorage.getItem(SHOWN_KEY)).toBe('1');
  });

  it(`a dismiss rests it ${REST_DAYS} days, then it may show again`, () => {
    const now = Date.now();
    noteInstallMoment({ trigger: 'booking' });
    showPending();
    closeInstall();
    sessionStorage.clear();
    resetInstallNudgeForTests();
    resetInstallPromptForTests();
    expect(mayAutoShow(now + (REST_DAYS - 1) * DAY)).toBe(false);
    expect(mayAutoShow(now + REST_DAYS * DAY + 1000)).toBe(true);
  });

  it(`after ${MAX_DISMISSALS} dismisses it never shows by itself again`, () => {
    localStorage.setItem(NUDGE_KEY, JSON.stringify({ dismissed: MAX_DISMISSALS, restUntil: 0 }));
    expect(mayAutoShow(Date.now() + 365 * DAY)).toBe(false);
    localStorage.setItem(
      NUDGE_KEY,
      JSON.stringify({ dismissed: MAX_DISMISSALS - 1, restUntil: 0 }),
    );
    expect(mayAutoShow()).toBe(true);
  });

  it('each dismiss (the close button, Escape, the backdrop) counts one', () => {
    noteInstallMoment({ trigger: 'booking' });
    showPending();
    closeInstall();
    expect(JSON.parse(localStorage.getItem(NUDGE_KEY)!).dismissed).toBe(1);
  });

  it('storage that fails: never shows', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    noteInstallMoment({ trigger: 'booking' });
    expect(showPending()).toBe(false);
  });

  it('a garbled record reads as fresh', () => {
    localStorage.setItem(NUDGE_KEY, '{not json');
    expect(mayAutoShow()).toBe(true);
    localStorage.setItem(NUDGE_KEY, JSON.stringify({ dismissed: 'x' }));
    expect(mayAutoShow()).toBe(true);
  });

  it('one ask per visit: after the push ask, no nudge; after the nudge, the push ask waits', () => {
    noteInstallMoment({ trigger: 'booking' });
    notePushAskShown();
    expect(showPending()).toBe(false);
    noteInstallMoment({ trigger: 'message' });
    expect(installNudgeBusy()).toBe(true);
    resetInstallNudgeForTests();
    resetInstallPromptForTests();
    sessionStorage.clear();
    expect(installNudgeBusy()).toBe(false);
    offerPrompt();
    noteInstallMoment({ trigger: 'booking' });
    expect(showPending()).toBe(true);
    closeInstall();
    expect(installNudgeBusy()).toBe(true);
  });

  it('a later moment replaces a waiting one', () => {
    noteInstallMoment({ trigger: 'onboarding' });
    noteInstallMoment({ trigger: 'booking', name: 'Ada' });
    showPending();
    expect(events()).toEqual([
      ['install_nudge_shown', { trigger: 'booking', platform: 'android' }],
    ]);
  });

  it('no moment, nothing to show: never on page load', () => {
    expect(showPending()).toBe(false);
    expect(track).not.toHaveBeenCalled();
  });
});

describe('the buttons and what they count', () => {
  it('Android "Install the app": the browser’s prompt, accepted', async () => {
    const e = offerPrompt('accepted');
    noteInstallMoment({ trigger: 'message', name: 'Ada' });
    showPending();
    await acceptInstall();
    expect(e.prompt).toHaveBeenCalledTimes(1);
    expect(events()).toEqual([
      ['install_nudge_shown', { trigger: 'message', platform: 'android' }],
      ['install_nudge_accepted', { trigger: 'message', platform: 'android' }],
    ]);
    // The prompt is used once.
    expect(installPlatform()).toBeNull();
  });

  it('Android prompt refused: counted as a dismiss', async () => {
    offerPrompt('dismissed');
    noteInstallMoment({ trigger: 'booking' });
    showPending();
    await acceptInstall();
    expect(events().at(-1)).toEqual([
      'install_nudge_dismissed',
      { trigger: 'booking', platform: 'android', how: 'prompt_dismissed' },
    ]);
    expect(JSON.parse(localStorage.getItem(NUDGE_KEY)!).dismissed).toBe(1);
  });

  it('iPhone: never an accepted event (a tap proves no install; pwa_installed counts it)', async () => {
    device({ ua: UA.iosSafari });
    noteInstallMoment({ trigger: 'onboarding' });
    showPending();
    await acceptInstall();
    expect(events().map(([e]) => e)).toEqual(['install_nudge_shown']);
  });

  it('the close says so', () => {
    offerPrompt();
    noteInstallMoment({ trigger: 'booking' });
    showPending();
    closeInstall();
    expect(events().at(-1)).toEqual([
      'install_nudge_dismissed',
      { trigger: 'booking', platform: 'android', how: 'closed' },
    ]);
  });
});

describe('the More menu’s "Install the app"', () => {
  it('opens it whatever the rules, and closing it there changes none of them', async () => {
    offerPrompt();
    localStorage.setItem(NUDGE_KEY, JSON.stringify({ dismissed: MAX_DISMISSALS, restUntil: 0 }));
    openFromMenu();
    expect(events()).toEqual([['install_nudge_shown', { trigger: 'menu', platform: 'android' }]]);
    closeInstall();
    expect(JSON.parse(localStorage.getItem(NUDGE_KEY)!).dismissed).toBe(MAX_DISMISSALS);
  });

  it('the What’s new tour’s Install app: trigger tour, and closing it is not a dismissal', () => {
    offerPrompt();
    openFromMenu('tour');
    expect(events()).toEqual([['install_nudge_shown', { trigger: 'tour', platform: 'android' }]]);
    closeInstall();
    // No strike recorded: the device's dismiss count is untouched.
    expect(localStorage.getItem(NUDGE_KEY)).toBeNull();
  });

  it('opens nothing where the sheet can’t help', async () => {
    openFromMenu();
    expect(track).not.toHaveBeenCalled();
  });
});
