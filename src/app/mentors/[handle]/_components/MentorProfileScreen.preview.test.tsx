import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fullProfile } from '@/components/organisms/ProfileHeader/profile.fixture';
import type { MentorProfile } from '@/types/mentor';
import { h, state } from './profileScreen.harness';
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
    expect(screen.getByText('Viewing your profile as a mentee.')).toBeInTheDocument();
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
    expect(screen.getByText('Back to editing your profile.')).toBeInTheDocument();
  });

  it('closes an open inline editor, as leaving its tab does', async () => {
    h.profile = state({ data: mine() });
    const user = userEvent.setup();
    render(<MentorProfileScreen handle="gbenga" />);
    await user.click(screen.getByRole('button', { name: 'Edit profile' }));
    expect(screen.getByRole('form', { name: 'Edit your name and headline' })).toBeInTheDocument();
    await user.click(bar());
    await user.click(bar());
    expect(screen.queryByRole('form', { name: 'Edit your name and headline' })).toBeNull();
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
});
