import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fullProfile } from '@/components/organisms/ProfileHeader/profile.fixture';
import { h, ownType, remote, state } from './profileScreen.harness';
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
vi.mock('@/lib/api/data/freeze', async () =>
  (await import('./profileScreen.harness')).mocks.freeze(),
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
vi.mock('@/lib/api/data/sessionTypes', async () =>
  (await import('./profileScreen.harness')).mocks.sessionTypes(),
);
vi.mock('@/lib/api/data/sessionTypeQuick', async () =>
  (await import('./profileScreen.harness')).mocks.sessionTypeQuick(),
);

const own = { ...fullProfile, owner: { approval: 'pending' as const, listed: true } };
const REVIEW_LINE =
  'We’re reviewing your application. You can edit your name and sessions now, and the rest once it’s reviewed.';
// Each reviewed control by its name: none of them while frozen.
const REVIEWED = [
  /Change cover/,
  /Photo options|Add photo/,
  /Edit topics/,
  /^Edit About$/,
  /^(Edit|Add) background$/,
  /^Add education$/,
  /^Add award$/,
];
const reviewedControls = () =>
  REVIEWED.flatMap((name) => [
    ...screen.queryAllByRole('button', { name }),
    ...screen.queryAllByLabelText(name),
  ]);

function inReview() {
  h.viewerExtra = { mentorStage: 'pending' };
  h.viewerIsMentor = true;
  h.profile = state({ data: own });
}

describe('MentorProfileScreen — the review freeze (Mentor Settings PR 2)', () => {
  it('in review: the bar says so; photo, cover, headline, About, topics, background, education and awards have no controls', () => {
    inReview();
    render(<MentorProfileScreen handle="gbenga" />);
    expect(screen.getByText(REVIEW_LINE)).toBeInTheDocument();
    expect(reviewedControls()).toEqual([]);
    expect(screen.queryByRole('meter', { name: 'Profile strength' })).toBeNull();
  });

  it('the names stay open: Edit profile opens with the headline held still (owner, 21 Oct)', async () => {
    inReview();
    const user = userEvent.setup();
    render(<MentorProfileScreen handle="gbenga" />);
    await user.click(screen.getByRole('button', { name: 'Edit profile' }));
    const form = screen.getByRole('form', { name: 'Edit your name and headline' });
    expect(within(form).getByRole('textbox', { name: 'First name' })).toBeEnabled();
    expect(within(form).getByRole('textbox', { name: 'Headline' })).toBeDisabled();
  });

  it('sessions stay open to edit', () => {
    inReview();
    h.search = new URLSearchParams('tab=sessions');
    h.ownTypes = remote([ownType()]);
    render(<MentorProfileScreen handle="gbenga" />);
    expect(screen.getByRole('switch', { name: /SOP draft review/ })).toBeEnabled();
  });

  it('a draft never submitted isn’t frozen', () => {
    h.viewerExtra = { mentorStage: 'unsubmitted' };
    h.viewerIsMentor = true;
    h.profile = state({ data: own });
    render(<MentorProfileScreen handle="gbenga" />);
    expect(screen.queryByText(REVIEW_LINE)).toBeNull();
    expect(screen.getByRole('button', { name: 'Edit About' })).toBeInTheDocument();
  });

  it('once decided, every control is back', () => {
    h.viewerExtra = { mentorStage: 'approved' };
    h.viewerIsMentor = true;
    h.profile = state({ data: { ...own, owner: { approval: 'approved', listed: true } } });
    render(<MentorProfileScreen handle="gbenga" />);
    expect(screen.queryByText(REVIEW_LINE)).toBeNull();
    expect(reviewedControls().length).toBeGreaterThanOrEqual(REVIEWED.length);
  });

  it('a save refused for the review: the editor closes, the bar says why, and focus moves to it', async () => {
    h.viewerIsMentor = true;
    h.profile = state({ data: { ...own, owner: { approval: 'approved', listed: true } } });
    const user = userEvent.setup();
    const { rerender } = render(<MentorProfileScreen handle="gbenga" />);
    await user.click(screen.getByRole('button', { name: 'Edit About' }));
    expect(screen.getByRole('textbox', { name: 'About' })).toBeInTheDocument();
    h.inReviewRefusal = true;
    rerender(<MentorProfileScreen handle="gbenga" />);
    expect(screen.queryByRole('textbox', { name: 'About' })).toBeNull();
    const line = screen.getByText(REVIEW_LINE);
    expect(line.closest('[tabindex="-1"]')).toHaveFocus();
    // The closed editor no longer holds "View as mentee" (review of PR 3).
    expect(screen.getByRole('button', { name: 'View as mentee' })).not.toHaveAttribute(
      'aria-disabled',
    );
    // Still frozen when the editor's error is cleared.
    h.inReviewRefusal = false;
    rerender(<MentorProfileScreen handle="gbenga" />);
    expect(screen.getByText(REVIEW_LINE)).toBeInTheDocument();
  });

  it('before /me answers: no reviewed controls; then in review, the line, and focus stays put', () => {
    h.viewerLoading = true;
    h.profile = state({ data: own });
    const { rerender } = render(<MentorProfileScreen handle="gbenga" />);
    expect(reviewedControls()).toEqual([]);
    h.viewerLoading = false;
    h.viewerExtra = { mentorStage: 'pending' };
    h.viewerIsMentor = true;
    rerender(<MentorProfileScreen handle="gbenga" />);
    expect(screen.getByText(REVIEW_LINE)).toBeInTheDocument();
    // How the page loaded, not a change: focus isn't moved on load.
    expect(screen.getByText(REVIEW_LINE).closest('[tabindex="-1"]')).not.toHaveFocus();
  });

  it('a refusal lets go once the decision comes (GitHub review of PR 359)', async () => {
    h.viewerIsMentor = true;
    h.viewerExtra = { mentorStage: 'approved' };
    h.profile = state({ data: { ...own, owner: { approval: 'approved', listed: true } } });
    const { rerender } = render(<MentorProfileScreen handle="gbenga" />);
    // A save refused (the cached stage was stale): frozen.
    h.inReviewRefusal = true;
    rerender(<MentorProfileScreen handle="gbenga" />);
    expect(screen.getByText(REVIEW_LINE)).toBeInTheDocument();
    // /me catches up: in review.
    h.viewerExtra = { mentorStage: 'pending' };
    rerender(<MentorProfileScreen handle="gbenga" />);
    expect(screen.getByText(REVIEW_LINE)).toBeInTheDocument();
    // Then approved, the old refusal still in the cache: every control is back.
    h.viewerExtra = { mentorStage: 'approved' };
    rerender(<MentorProfileScreen handle="gbenga" />);
    expect(screen.queryByText(REVIEW_LINE)).toBeNull();
    expect(reviewedControls().length).toBeGreaterThanOrEqual(REVIEWED.length);
  });

  it('"View as mentee" shows the preview line, not the review one', async () => {
    inReview();
    const user = userEvent.setup();
    render(<MentorProfileScreen handle="gbenga" />);
    await user.click(screen.getByRole('button', { name: 'View as mentee' }));
    expect(screen.queryByText(REVIEW_LINE)).toBeNull();
  });
});

describe('MentorProfileScreen — the owner’s share note', () => {
  const open = async (approval: 'pending' | 'approved' | 'declined', listed = true) => {
    h.viewerIsMentor = true;
    h.profile = state({ data: { ...fullProfile, owner: { approval, listed } } });
    const user = userEvent.setup();
    render(<MentorProfileScreen handle="gbenga" />);
    await user.click(screen.getByRole('button', { name: 'Share profile' }));
    return screen.getByRole('menu', { name: 'Share' });
  };
  const HIDDEN = 'Only you can see this page. Others see “This mentor profile isn’t available”.';

  it('pending: who can see it until approved, and the options still work', async () => {
    const menu = await open('pending');
    expect(menu).toHaveAccessibleDescription(
      'Only you can see this page until you’re approved. Others see “This mentor profile isn’t available”.',
    );
    expect(within(menu).getByRole('menuitem', { name: /Copy profile link/ })).toBeInTheDocument();
  });

  it('declined: the shorter note', async () => {
    expect(await open('declined')).toHaveAccessibleDescription(HIDDEN);
  });

  it('unlisted: the shorter note', async () => {
    expect(await open('approved', false)).toHaveAccessibleDescription(HIDDEN);
  });

  it('approved and listed: no note', async () => {
    expect(await open('approved')).not.toHaveAccessibleDescription();
  });
});
