import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fullProfile, sessionTypes } from '@/components/organisms/ProfileHeader/profile.fixture';
import type { MentorProfile } from '@/types/mentor';
import { h, remote, replace, saveTopics, state } from './profileScreen.harness';
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

type Owner = NonNullable<MentorProfile['owner']>;
const mine = (owner: Partial<Owner> = {}, over: Partial<MentorProfile> = {}): MentorProfile => ({
  ...fullProfile,
  ...over,
  owner: { approval: 'approved', listed: true, setupNeeded: [], ...owner },
});
const bar = () => screen.getByRole('button', { name: 'View as mentee' });

describe('MentorProfileScreen — "View as mentee"', () => {
  beforeEach(() => {
    // The owner is a mentor, who can't book.
    h.viewerIsMentor = true;
  });

  it('shows the page as mentees see it: no edit controls, Book drawn but off', async () => {
    h.profile = state({ data: mine() });
    const user = userEvent.setup();
    render(<MentorProfileScreen handle="gbenga" />);
    expect(bar()).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Edit profile' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Book a session/ })).toBeNull();

    await user.click(bar());
    expect(bar()).toHaveAttribute('aria-pressed', 'true');
    expect(bar()).toHaveFocus();
    expect(screen.getByText('This is how mentees see your profile.')).toBeInTheDocument();
    for (const name of [/Edit profile/, /Change cover/, /Edit topics/, /^Edit /, /^Delete /])
      expect(screen.queryByRole('button', { name })).toBeNull();
    expect(document.querySelector('input[type="file"]')).toBeNull();
    // Book as drawn, but off.
    expect(screen.getByRole('button', { name: 'Book a session' })).toBeDisabled();
    const aside = screen.getByRole('complementary');
    expect(within(aside).getByRole('button', { name: /Book this session/ })).toBeDisabled();
    // A mentee-facing suggestion, shown as a mentee would see it.
    expect(within(aside).getByRole('heading', { name: 'Similar mentors' })).toBeInTheDocument();
    // No strength card: that's the owner's, not a mentee's.
    expect(screen.queryByRole('meter')).toBeNull();

    await user.click(bar());
    expect(bar()).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Edit profile' })).toBeInTheDocument();
  });

  it('waits while an inline edit is open, so the draft is kept (review of PR 106)', async () => {
    h.profile = state({ data: mine() });
    const user = userEvent.setup();
    render(<MentorProfileScreen handle="gbenga" />);
    await user.click(screen.getByRole('button', { name: 'Edit profile' }));
    const form = screen.getByRole('form', { name: 'Edit your name and headline' });
    const headline = within(form).getByRole('textbox', { name: 'Headline' });
    await user.clear(headline);
    await user.type(headline, 'Draft');
    expect(bar()).toHaveAttribute('aria-disabled', 'true');
    expect(bar()).toHaveAccessibleDescription('Save or cancel your edit to preview.');
    await user.click(bar());
    expect(bar()).toHaveAttribute('aria-pressed', 'false');
    expect(within(form).getByRole('textbox', { name: 'Headline' })).toHaveValue('Draft');
  });

  it('a ?book= link never opens booking for the owner, previewing or not', async () => {
    h.search = new URLSearchParams(`book=${sessionTypes[0]!.id}`);
    h.sessionTypesRemote = remote(sessionTypes);
    h.profile = state({ data: mine() });
    const user = userEvent.setup();
    render(<MentorProfileScreen handle="gbenga" />);
    expect(screen.queryByRole('dialog')).toBeNull();
    await user.click(bar());
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('the Sessions tab: Book drawn but off', async () => {
    h.search = new URLSearchParams('tab=sessions');
    h.profile = state({ data: mine() });
    const user = userEvent.setup();
    render(<MentorProfileScreen handle="gbenga" />);
    expect(screen.queryByRole('button', { name: /Book session/ })).toBeNull();
    await user.click(bar());
    const panel = screen.getByRole('tabpanel');
    expect(within(panel).getByRole('button', { name: 'Book session' })).toBeDisabled();
  });

  it('not taking bookings: shows what mentees see (review of PR 106)', async () => {
    h.profile = state({ data: mine({}, { takingBookings: false }) });
    const user = userEvent.setup();
    render(<MentorProfileScreen handle="gbenga" />);
    await user.click(bar());
    expect(screen.getAllByText('Not taking bookings').length).toBeGreaterThan(0);
    expect(screen.getByRole('tab', { name: 'Sessions (0)' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Book/ })).toBeNull();
  });

  it('a new mentor: the first-mentees card’s Book is drawn but off too (Codex on PR 106)', async () => {
    h.profile = state({
      data: mine(
        {},
        {
          mentor: {
            ...fullProfile.mentor,
            completedSessions: 1,
            nextAvailableState: 'open',
            nextAvailableAt: '2026-10-02T15:00:00Z',
          },
        },
      ),
    });
    const user = userEvent.setup();
    render(<MentorProfileScreen handle="gbenga" />);
    await user.click(bar());
    const books = screen.getAllByRole('button', { name: /^Book/ });
    // The header, the booking card, and the first-mentees card.
    expect(books.length).toBeGreaterThanOrEqual(3);
    for (const b of books) expect(b).toBeDisabled();
  });

  it('offline, Book still reads as a mentee’s (review of PR 106)', async () => {
    const online = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    h.profile = state({ data: mine() });
    const user = userEvent.setup();
    render(<MentorProfileScreen handle="gbenga" />);
    await user.click(bar());
    expect(screen.getByRole('button', { name: 'Book a session' })).toBeDisabled();
    expect(screen.queryByText('Booking needs a connection')).toBeNull();
    online.mockRestore();
  });
});

describe('MentorProfileScreen — the owner bar', () => {
  beforeEach(() => {
    h.viewerIsMentor = true;
  });

  it('no weekly hours: says what mentees see, and where to set them', () => {
    h.profile = state({ data: mine({ setupNeeded: ['weekly_hours'] }) });
    render(<MentorProfileScreen handle="gbenga" />);
    expect(
      screen.getByText(
        (_, el) =>
          el?.tagName === 'SPAN' &&
          el.textContent === 'Mentees see “Not taking bookings” until you set your weekly hours.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'set your weekly hours' })).toHaveAttribute(
      'href',
      '/session-types',
    );
  });

  it('declined: "Contact support" links to the configured address; plain without one', () => {
    vi.stubEnv('NEXT_PUBLIC_SUPPORT_EMAIL', 'support@example.com');
    h.profile = state({ data: mine({ approval: 'declined' }) });
    const { unmount } = render(<MentorProfileScreen handle="gbenga" />);
    expect(screen.getByRole('link', { name: 'Contact support' })).toHaveAttribute(
      'href',
      'mailto:support@example.com',
    );
    unmount();
    vi.stubEnv('NEXT_PUBLIC_SUPPORT_EMAIL', 'not an address');
    render(<MentorProfileScreen handle="gbenga" />);
    expect(screen.queryByRole('link', { name: 'Contact support' })).toBeNull();
    expect(
      screen.getByText(
        'Your profile wasn’t approved, so only you can see it. Contact support to find out what to change.',
      ),
    ).toBeInTheDocument();
    vi.unstubAllEnvs();
  });

  it('previewing a profile nobody else can see says so (review of PR 106)', async () => {
    const user = userEvent.setup();
    h.profile = state({ data: mine({ approval: 'pending' }) });
    const { unmount } = render(<MentorProfileScreen handle="gbenga" />);
    await user.click(bar());
    expect(
      screen.getByText(
        'Only you can see your profile. This is how it will look to mentees once it’s approved.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText('This is how mentees see your profile.')).toBeNull();
    unmount();
    h.profile = state({ data: mine({ listed: false }) });
    render(<MentorProfileScreen handle="gbenga" />);
    await user.click(bar());
    expect(
      screen.getByText(
        'Only you can see your profile. This is how it will look to mentees once it’s listed.',
      ),
    ).toBeInTheDocument();
  });

  it('most important first: hidden, then no session type, then no hours', () => {
    const says = (owner: Partial<Owner>, text: RegExp) => {
      h.profile = state({ data: mine(owner) });
      const { unmount } = render(<MentorProfileScreen handle="gbenga" />);
      expect(screen.getByText(text)).toBeInTheDocument();
      unmount();
    };
    says(
      { approval: 'pending', setupNeeded: ['session_type', 'weekly_hours'] },
      /^Only you can see this until your profile is approved\.$/,
    );
    says(
      { listed: false, setupNeeded: ['session_type'] },
      /^Your profile is unlisted\. Only you can see it\.$/,
    );
    says(
      { setupNeeded: ['session_type', 'weekly_hours'] },
      /^Mentees see “Not taking bookings” on your profile\. Turn on a session type/,
    );
  });
});

describe('MentorProfileScreen — Profile strength', () => {
  beforeEach(() => {
    h.viewerIsMentor = true;
  });

  it('the owner sees how complete the profile is and the next two steps', async () => {
    h.profile = state({
      data: mine({
        setupNeeded: ['weekly_hours'],
        completeness: { percent: 78, missing: ['weekly_hours', 'award', 'about'] },
      }),
    });
    const user = userEvent.setup();
    render(<MentorProfileScreen handle="gbenga" />);
    const aside = screen.getByRole('complementary', { name: /profile strength/i });
    expect(within(aside).getByRole('meter', { name: 'Profile strength' })).toHaveAttribute(
      'aria-valuenow',
      '78',
    );
    expect(within(aside).getByRole('link', { name: /Set your weekly hours/ })).toHaveAttribute(
      'href',
      '/session-types',
    );
    expect(within(aside).queryByText(/Write your About/)).toBeNull();
    await user.click(within(aside).getByRole('button', { name: /Add a scholarship or award/ }));
    expect(screen.getByRole('dialog', { name: 'Add an award' })).toBeInTheDocument();
  });

  it('the photo step opens the photo picker', async () => {
    h.profile = state({ data: mine({ completeness: { percent: 89, missing: ['photo'] } }) });
    const click = vi.spyOn(HTMLInputElement.prototype, 'click');
    const user = userEvent.setup();
    render(<MentorProfileScreen handle="gbenga" />);
    await user.click(screen.getByRole('button', { name: /Add a profile photo/ }));
    expect(click.mock.contexts.some((el) => (el as HTMLInputElement).type === 'file')).toBe(true);
    click.mockRestore();
  });

  it('gone at 100%; on the Reviews tab too while steps are left', () => {
    h.profile = state({ data: mine({ completeness: { percent: 100, missing: [] } }) });
    const { unmount } = render(<MentorProfileScreen handle="gbenga" />);
    expect(screen.queryByRole('meter')).toBeNull();
    unmount();
    h.search = new URLSearchParams('tab=reviews');
    h.profile = state({ data: mine({ completeness: { percent: 44, missing: ['award'] } }) });
    render(<MentorProfileScreen handle="gbenga" />);
    expect(screen.getByRole('meter', { name: 'Profile strength' })).toBeInTheDocument();
  });

  it('a step done from the Reviews tab: About opens on Overview', async () => {
    h.search = new URLSearchParams('tab=reviews');
    h.profile = state({ data: mine({ completeness: { percent: 89, missing: ['about'] } }) });
    const user = userEvent.setup();
    render(<MentorProfileScreen handle="gbenga" />);
    await user.click(screen.getByRole('button', { name: /Write your About/ }));
    expect(replace).toHaveBeenCalledWith('/mentors/gbenga', { scroll: false });
  });

  it('once a tip’s step is done, focus moves to the next tip (review of PR 106)', async () => {
    h.search = new URLSearchParams('tab=reviews');
    h.profile = state({
      data: mine({ completeness: { percent: 78, missing: ['award', 'about'] } }),
    });
    const user = userEvent.setup();
    const { rerender } = render(<MentorProfileScreen handle="gbenga" />);
    await user.click(screen.getByRole('button', { name: /Add a scholarship or award/ }));
    const dialog = screen.getByRole('dialog', { name: 'Add an award' });
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(screen.getByRole('button', { name: /Add a scholarship or award/ })).toHaveFocus();
    // The award landed: the refetched profile no longer lists it.
    h.profile = state({ data: mine({ completeness: { percent: 89, missing: ['about'] } }) });
    rerender(<MentorProfileScreen handle="gbenga" />);
    expect(screen.getByRole('button', { name: /Write your About/ })).toHaveFocus();
  });

  it('…and to the toggle once the card is gone at 100%', async () => {
    h.profile = state({ data: mine({ completeness: { percent: 89, missing: ['award'] } }) });
    const user = userEvent.setup();
    const { rerender } = render(<MentorProfileScreen handle="gbenga" />);
    await user.click(screen.getByRole('button', { name: /Add a scholarship or award/ }));
    await user.click(
      within(screen.getByRole('dialog', { name: 'Add an award' })).getByRole('button', {
        name: 'Cancel',
      }),
    );
    h.profile = state({ data: mine({ completeness: { percent: 100, missing: [] } }) });
    rerender(<MentorProfileScreen handle="gbenga" />);
    expect(screen.queryByRole('meter')).toBeNull();
    expect(bar()).toHaveFocus();
  });

  it('a topics save from its tip: focus on "Edit topics" (Codex on PR 106)', async () => {
    h.profile = state({
      data: mine({ completeness: { percent: 78, missing: ['topics', 'award'] } }),
    });
    // The save lands and the refetched profile no longer lists topics.
    saveTopics.mockImplementation(() => {
      h.profile = state({ data: mine({ completeness: { percent: 89, missing: ['award'] } }) });
    });
    const user = userEvent.setup();
    render(<MentorProfileScreen handle="gbenga" />);
    await user.click(screen.getByRole('button', { name: /Add the topics you help with/ }));
    const dialog = screen.getByRole('dialog', { name: 'What you help with' });
    await user.click(within(dialog).getByRole('button', { name: 'Test preparation' }));
    await user.click(within(dialog).getByRole('button', { name: 'Save topics' }));
    expect(saveTopics).toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('button', { name: 'Edit topics' })).toHaveFocus();
  });

  it('an award saved from its tip on Reviews: focus on the next tip (Codex on PR 106)', async () => {
    h.search = new URLSearchParams('tab=reviews');
    h.profile = state({
      data: mine({ completeness: { percent: 78, missing: ['award', 'about'] } }),
    });
    // The save lands and the refetched profile no longer lists the award.
    h.onAwardAdded = () => {
      h.profile = state({ data: mine({ completeness: { percent: 89, missing: ['about'] } }) });
    };
    const user = userEvent.setup();
    render(<MentorProfileScreen handle="gbenga" />);
    await user.click(screen.getByRole('button', { name: /Add a scholarship or award/ }));
    const dialog = screen.getByRole('dialog', { name: 'Add an award' });
    await user.type(within(dialog).getByRole('textbox', { name: 'Award name' }), 'Fulbright');
    await user.type(within(dialog).getByRole('textbox', { name: 'Awarded by' }), 'Stanford');
    await user.click(within(dialog).getByRole('button', { name: 'Add award' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('button', { name: /Write your About/ })).toHaveFocus();
  });

  describe('About kept on Overview while another tab shows (review of PR 137)', () => {
    it('opened from its tip on Reviews: focused once Overview shows', async () => {
      h.search = new URLSearchParams('tab=reviews');
      h.profile = state({ data: mine({ completeness: { percent: 89, missing: ['about'] } }) });
      const user = userEvent.setup();
      const { rerender } = render(<MentorProfileScreen handle="gbenga" />);
      const tip = screen.getByRole('button', { name: /Write your About/ });
      await user.click(tip);
      // A browser leaves focus on the tip: the editor mounted hidden.
      tip.focus();
      h.search = new URLSearchParams('tab=overview');
      rerender(<MentorProfileScreen handle="gbenga" />);
      expect(screen.getByRole('textbox', { name: 'About' })).toHaveFocus();
    });

    it('on another tab, "View as mentee" says where the open edit is', async () => {
      h.profile = state({ data: mine() });
      const user = userEvent.setup();
      const { rerender } = render(<MentorProfileScreen handle="gbenga" />);
      await user.click(screen.getByRole('button', { name: 'Edit About' }));
      h.search = new URLSearchParams('tab=reviews');
      rerender(<MentorProfileScreen handle="gbenga" />);
      expect(bar()).toHaveAttribute('aria-disabled', 'true');
      expect(bar()).toHaveAccessibleDescription(
        'Save or cancel your About edit on Overview to preview.',
      );
    });

    it('a save failing while Overview is hidden is said outside it', async () => {
      h.profile = state({ data: mine() });
      const user = userEvent.setup();
      const { rerender } = render(<MentorProfileScreen handle="gbenga" />);
      await user.click(screen.getByRole('button', { name: 'Edit About' }));
      h.search = new URLSearchParams('tab=reviews');
      rerender(<MentorProfileScreen handle="gbenga" />);
      h.aboutError = 'Something went wrong. Try again.';
      rerender(<MentorProfileScreen handle="gbenga" />);
      expect(
        screen
          .getAllByRole('status')
          .some(
            (s) =>
              s.textContent === 'Your About section wasn’t saved. Something went wrong. Try again.',
          ),
      ).toBe(true);
    });
  });
});
