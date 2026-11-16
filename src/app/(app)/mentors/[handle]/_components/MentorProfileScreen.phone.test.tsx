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

// IntersectionObserver as the browser drives it: each test says where the
// booking card is relative to the viewport.
type Watch = { cb: IntersectionObserverCallback; el: Element | null };
let watches: Watch[] = [];
class FakeObserver {
  watch: Watch;
  constructor(cb: IntersectionObserverCallback) {
    this.watch = { cb, el: null };
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
const phone = (on: boolean) => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: on && query.includes('max-width: 767px'),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
};
// The floating pill: a top-level button of the screen (FloatingPill's own box),
// unlike the header's Book of the same name.
const pill = () =>
  screen
    .queryAllByRole('button', { name: 'Book a session' })
    .find((b) => b.parentElement?.parentElement?.parentElement === document.body) ?? null;
const bookCard = () => document.getElementById('profile-book');

// Three session types: the Sessions tab shows (PRD, 21 Oct).
const profile: MentorProfile = { ...fullProfile, sessionTypes };
const scrollIntoView = vi.fn();

beforeEach(() => {
  watches = [];
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
