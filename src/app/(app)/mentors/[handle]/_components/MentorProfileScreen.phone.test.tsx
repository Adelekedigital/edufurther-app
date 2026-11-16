import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fullProfile, sessionTypes } from '@/components/organisms/ProfileHeader/profile.fixture';
import type { MentorProfile } from '@/types/mentor';
import { h, remote, state } from './profileScreen.harness';
import { MentorProfileScreen } from './MentorProfileScreen';

// The data hooks, mocked (hoisted above the imports; state lives in the harness).
vi.mock('next/navigation', async () =>
  (await import('./profileScreen.harness')).mocks.navigation(),
);
vi.mock('@/app/_shell/useAppShell', async () =>
  (await import('./profileScreen.harness')).mocks.appShell(),
);
vi.mock('@/lib/api/data/reviews', async () =>
  (await import('./profileScreen.harness')).mocks.reviews(),
);
vi.mock('@/lib/api/data/reviewWrite', async () =>
  (await import('./profileScreen.harness')).mocks.reviewWrite(),
);
vi.mock('@/lib/api/data/similar', async () =>
  (await import('./profileScreen.harness')).mocks.similar(),
);
vi.mock('@/lib/api/data/freeSoon', async () =>
  (await import('./profileScreen.harness')).mocks.freeSoon(),
);
vi.mock('@/lib/api/data/profile', async () =>
  (await import('./profileScreen.harness')).mocks.profile(),
);
vi.mock('@/lib/api/data/cover', async () =>
  (await import('./profileScreen.harness')).mocks.cover(),
);
vi.mock('@/lib/api/data/avatar', async () =>
  (await import('./profileScreen.harness')).mocks.avatar(),
);
vi.mock('@/lib/api/data/profileEdit', async () =>
  (await import('./profileScreen.harness')).mocks.profileEdit(),
);
vi.mock('@/lib/api/data/booking', async () =>
  (await import('./profileScreen.harness')).mocks.booking(),
);
vi.mock('@/lib/api/data/profileEntries', async () =>
  (await import('./profileScreen.harness')).mocks.profileEntries(),
);
vi.mock('@/lib/api/data/sessionTypes', async () =>
  (await import('./profileScreen.harness')).mocks.sessionTypes(),
);
vi.mock('@/lib/api/data/sessionTypeQuick', async () =>
  (await import('./profileScreen.harness')).mocks.sessionTypeQuick(),
);
vi.mock('@/lib/api/data/profileItems', async () =>
  (await import('./profileScreen.harness')).mocks.profileItems(),
);
vi.mock('@/lib/api/data/catalog', async () =>
  (await import('./profileScreen.harness')).mocks.catalog(),
);
vi.mock('@/lib/api/data/mentors', async (original) => ({
  ...(await original<object>()),
  ...(await import('./profileScreen.harness')).mocks.topics(),
}));
// Messages on, with the composer stubbed as its dialog (as the message suite does).
vi.mock('@/lib/config/messages', () => ({ MESSAGES_LIVE: true }));
vi.mock('@/app/_shell/SendMessageLauncher', () => ({
  SendMessageLauncher: ({ to }: { to: { firstName: string } | null }) =>
    to ? <div role="dialog" aria-modal="true" aria-label={`Message ${to.firstName}`} /> : null,
}));

// IntersectionObserver as the browser drives it: each test says where the
// booking card is relative to the viewport.
type Watch = {
  cb: IntersectionObserverCallback;
  el: Element | null;
  options?: IntersectionObserverInit;
};
let watches: Watch[] = [];
class FakeObserver {
  watch: Watch;
  constructor(cb: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    this.watch = { cb, el: null, options };
    watches.push(this.watch);
  }
  observe(el: Element) {
    this.watch.el = el;
  }
  unobserve() {}
  disconnect() {
    this.watch.el = null;
  }
  takeRecords() {
    return [];
  }
}
/** The card is above the viewport (scrolled past), in view, or below it (not reached). */
const cardIs = (where: 'above' | 'in' | 'below') =>
  act(() => {
    for (const w of watches.filter((x) => x.el?.id === 'profile-book')) {
      const entry = {
        target: w.el,
        isIntersecting: where === 'in',
        boundingClientRect: {
          top: where === 'above' ? -400 : 900,
          bottom: where === 'above' ? -20 : 1200,
        },
        rootBounds: { top: 0, bottom: 800 },
      } as unknown as IntersectionObserverEntry;
      w.cb([entry], w as unknown as IntersectionObserver);
    }
  });
// matchMedia whose phone query can flip mid-test, telling its listeners (useMediaQuery).
let isPhoneNow = true;
const mediaListeners = new Set<() => void>();
const phone = (on: boolean) => {
  isPhoneNow = on;
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    get matches() {
      return isPhoneNow && query.includes('max-width: 767px');
    },
    media: query,
    addEventListener: (_: string, cb: () => void) => mediaListeners.add(cb),
    removeEventListener: (_: string, cb: () => void) => mediaListeners.delete(cb),
  }));
};
const resizeTo = (on: boolean) =>
  act(() => {
    isPhoneNow = on;
    for (const cb of [...mediaListeners]) cb();
  });
/** The floating Book pill (inside FloatingPill's data-floating-pill), or null. */
const pill = () => document.querySelector<HTMLElement>('[data-floating-pill] button');
const bookCard = () => document.getElementById('profile-book');

// Three session types: the Sessions tab shows (PRD, 21 Oct).
const profile: MentorProfile = { ...fullProfile, sessionTypes };
const scrollIntoView = vi.fn();

beforeEach(() => {
  watches = [];
  mediaListeners.clear();
  window.IntersectionObserver = FakeObserver as unknown as typeof IntersectionObserver;
  Element.prototype.scrollIntoView = scrollIntoView;
  scrollIntoView.mockReset();
  h.sessionTypesRemote = remote(sessionTypes);
  phone(true);
});

describe('MentorProfileScreen on phones: booking first (owner, 16 Nov 2026)', () => {
  it('Overview: the booking card sits under the tabs, before About, out of the aside', () => {
    h.profile = state({ data: profile });
    render(<MentorProfileScreen handle="gbenga" />);
    const card = bookCard()!;
    expect(card).toBeInTheDocument();
    expect(card.closest('aside')).toBeNull();
    const tabs = screen.getByRole('tablist');
    const about = screen.getByRole('heading', { name: 'About' });
    expect(tabs.compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(card.compareDocumentPosition(about) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // The rest of the aside stays below the main column, and no longer says "booking".
    const aside = screen.getByRole('complementary');
    expect(aside).not.toHaveAccessibleName(/booking/i);
    expect(within(aside).getByRole('heading', { name: 'Similar mentors' })).toBeInTheDocument();
  });

  it('Reviews: the booking card sits under the tabs, before the reviews', () => {
    // The tab lives in the URL (useProfileTab).
    h.search = new URLSearchParams('tab=reviews');
    h.profile = state({ data: profile });
    render(<MentorProfileScreen handle="gbenga" />);
    expect(screen.getByRole('tab', { name: /Reviews/ })).toHaveAttribute('aria-selected', 'true');
    const card = bookCard()!;
    const panel = screen.getByRole('tabpanel');
    expect(card.closest('aside')).toBeNull();
    expect(card.compareDocumentPosition(panel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('not taking bookings: the note moves under the tabs, and there is no pill', () => {
    h.profile = state({ data: { ...profile, takingBookings: false } });
    render(<MentorProfileScreen handle="gbenga" />);
    const note = screen.getByRole('heading', { name: 'Not taking bookings' }).closest('section')!;
    expect(note.closest('aside')).toBeNull();
    expect(
      note.compareDocumentPosition(screen.getByRole('heading', { name: 'About' })) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(bookCard()).toBeNull();
    expect(pill()).toBeNull();
  });

  it('desktop is unchanged: the booking card stays in the aside, no pill', () => {
    phone(false);
    h.profile = state({ data: profile });
    render(<MentorProfileScreen handle="gbenga" />);
    expect(bookCard()!.closest('aside')).toHaveAccessibleName(/booking/i);
    cardIs('above');
    expect(pill()).toBeNull();
  });
});

describe('MentorProfileScreen on phones: the floating Book pill', () => {
  it('shows only once the card has scrolled up out of view, and goes when it is back', () => {
    h.profile = state({ data: profile });
    render(<MentorProfileScreen handle="gbenga" />);
    expect(pill()).toBeNull();
    // Not reached yet (below the fold): no pill.
    cardIs('below');
    expect(pill()).toBeNull();
    cardIs('above');
    expect(pill()).toBeInTheDocument();
    cardIs('in');
    expect(pill()).toBeNull();
  });

  it('appearing never takes focus; a tap scrolls back to the card and focuses it', async () => {
    h.profile = state({ data: profile });
    const user = userEvent.setup();
    render(<MentorProfileScreen handle="gbenga" />);
    const tab = screen.getByRole('tab', { name: /Overview/ });
    tab.focus();
    cardIs('above');
    expect(tab).toHaveFocus();
    await user.click(pill()!);
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
    expect(bookCard()).toContainElement(document.activeElement as HTMLElement);
  });

  it('focused when the card comes back into view: focus moves to the card, not body', () => {
    h.profile = state({ data: profile });
    render(<MentorProfileScreen handle="gbenga" />);
    cardIs('above');
    pill()!.focus();
    expect(pill()).toHaveFocus();
    // Scrolled back up with the keyboard: the card intersects, the pill goes.
    cardIs('in');
    expect(pill()).toBeNull();
    expect(document.activeElement).not.toBe(document.body);
    expect(document.activeElement).toBe(
      within(bookCard()!).getAllByRole('button', { name: /^Book/ })[0],
    );
  });

  it('no pill on the Sessions tab, where there is no card', () => {
    h.profile = state({ data: profile });
    const { rerender } = render(<MentorProfileScreen handle="gbenga" />);
    cardIs('above');
    expect(pill()).toBeInTheDocument();
    // The tab lives in the URL (useProfileTab).
    h.search = new URLSearchParams('tab=sessions');
    rerender(<MentorProfileScreen handle="gbenga" />);
    expect(bookCard()).toBeNull();
    cardIs('above');
    expect(pill()).toBeNull();
  });

  it('none while the booking flow is open', async () => {
    h.profile = state({ data: profile });
    const user = userEvent.setup();
    render(<MentorProfileScreen handle="gbenga" />);
    cardIs('above');
    // The header's Book opens the flow (the pill is the other "Book a session").
    const header = screen
      .getAllByRole('button', { name: 'Book a session' })
      .find((b) => b !== pill())!;
    await user.click(header);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    cardIs('above');
    expect(pill()).toBeNull();
  });

  it('none for the owner, editing or viewing as a mentee', async () => {
    h.viewerIsMentor = true;
    h.profile = state({
      data: { ...profile, owner: { approval: 'approved', listed: true, setupNeeded: [] } },
    });
    const user = userEvent.setup();
    render(<MentorProfileScreen handle="gbenga" />);
    cardIs('above');
    expect(pill()).toBeNull();
    await user.click(screen.getByRole('button', { name: 'View as mentee' }));
    // The card is drawn (off) under the tabs, as a mentee would see it…
    expect(bookCard()!.closest('aside')).toBeNull();
    cardIs('above');
    // …but nothing to book, so no pill.
    expect(pill()).toBeNull();
  });

  it('none while an admin previews as this user', () => {
    h.previewingAsUser = true;
    h.profile = state({ data: profile });
    render(<MentorProfileScreen handle="gbenga" />);
    cardIs('above');
    expect(pill()).toBeNull();
  });

  it('none for a mentor visiting, who cannot book', () => {
    h.viewerIsMentor = true;
    h.profile = state({ data: profile });
    render(<MentorProfileScreen handle="gbenga" />);
    expect(bookCard()).toBeNull();
    cardIs('above');
    expect(pill()).toBeNull();
  });
});

describe('MentorProfileScreen on phones: more of the pill', () => {
  it('guests get it too, placed on the shared bottom-chrome height (over the guest bar)', () => {
    h.isGuest = true;
    h.profile = state({ data: profile });
    render(<MentorProfileScreen handle="gbenga" />);
    cardIs('above');
    const box = pill()!.closest<HTMLElement>('[data-floating-pill]')!;
    expect(box.style.getPropertyValue('--pill-bottom')).toBe(
      'calc(var(--bottom-chrome-h) + var(--space-4))',
    );
  });

  it('"past" is measured from under the sticky header', () => {
    const header = document.createElement('header');
    header.setAttribute('data-shell-header', '');
    header.getBoundingClientRect = () => ({ bottom: 64 }) as DOMRect;
    document.body.append(header);
    h.profile = state({ data: profile });
    render(<MentorProfileScreen handle="gbenga" />);
    const w = watches.find((x) => x.el?.id === 'profile-book')!;
    expect(w.options?.rootMargin).toBe('-64px 0px 0px 0px');
    header.remove();
  });

  it('phone to desktop and back: one booking card, moving; the pill only on the phone', () => {
    h.profile = state({ data: profile });
    render(<MentorProfileScreen handle="gbenga" />);
    cardIs('above');
    expect(pill()).toBeInTheDocument();
    resizeTo(false);
    expect(document.querySelectorAll('#profile-book')).toHaveLength(1);
    expect(bookCard()!.closest('aside')).not.toBeNull();
    cardIs('above');
    expect(pill()).toBeNull();
    resizeTo(true);
    expect(document.querySelectorAll('#profile-book')).toHaveLength(1);
    expect(bookCard()!.closest('aside')).toBeNull();
  });

  it('Reviews: the "no session yet" note\'s Book scrolls to the card under the tabs', async () => {
    h.search = new URLSearchParams('tab=reviews');
    h.reviewPrompt = 'none';
    h.profile = state({ data: profile });
    const user = userEvent.setup();
    render(<MentorProfileScreen handle="gbenga" />);
    const note = screen
      .getByText('You can review Gbenga after your first session')
      .closest('div')!.parentElement!;
    await user.click(within(note).getByRole('button', { name: 'Book a session' }));
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
    expect(bookCard()!.closest('aside')).toBeNull();
    expect(bookCard()).toContainElement(document.activeElement as HTMLElement);
  });

  it('under prefers-reduced-motion the tap jumps instead of gliding', async () => {
    const media = window.matchMedia;
    window.matchMedia = ((q: string) =>
      q === '(prefers-reduced-motion: reduce)'
        ? ({
            matches: true,
            addEventListener() {},
            removeEventListener() {},
          } as unknown as MediaQueryList)
        : media(q)) as typeof window.matchMedia;
    h.profile = state({ data: profile });
    const user = userEvent.setup();
    render(<MentorProfileScreen handle="gbenga" />);
    cardIs('above');
    await user.click(pill()!);
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto', block: 'start' });
  });

  it('none while the share dialog is open', async () => {
    h.profile = state({ data: profile });
    const user = userEvent.setup();
    render(<MentorProfileScreen handle="gbenga" />);
    cardIs('above');
    expect(pill()).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Share profile' }));
    cardIs('above');
    expect(pill()).toBeNull();
  });

  it('none while the review dialog is open', async () => {
    h.search = new URLSearchParams('tab=reviews');
    h.reviewPrompt = 'due';
    h.reviewableRemote = remote([
      { id: 's1', startsAt: '2026-09-19T15:00:00Z', typeName: 'SOP draft review' },
    ]);
    h.profile = state({ data: profile });
    const user = userEvent.setup();
    render(<MentorProfileScreen handle="gbenga" />);
    cardIs('above');
    expect(pill()).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Write a review' }));
    cardIs('above');
    expect(pill()).toBeNull();
  });

  it('none while the message composer is open', async () => {
    h.profile = state({ data: { ...profile, canMessage: true } });
    const user = userEvent.setup();
    render(<MentorProfileScreen handle="gbenga" />);
    cardIs('above');
    expect(pill()).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Message' }));
    expect(screen.getByRole('dialog', { name: 'Message Gbenga' })).toBeInTheDocument();
    cardIs('above');
    expect(pill()).toBeNull();
  });

  it('a new mentor with no track record or similar mentors: no empty aside landmark', () => {
    h.similarRemote = remote([]);
    h.profile = state({
      data: { ...profile, mentor: { ...profile.mentor, completedSessions: 0 } },
    });
    render(<MentorProfileScreen handle="gbenga" />);
    expect(bookCard()).toBeInTheDocument();
    expect(screen.queryByRole('complementary')).toBeNull();
  });
});
