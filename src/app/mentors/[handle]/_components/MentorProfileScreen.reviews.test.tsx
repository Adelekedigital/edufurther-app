import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fullProfile, reviews } from '@/components/organisms/ProfileHeader/profile.fixture';
import type { MyReview } from '@/types/mentor';
import {
  h,
  remote,
  reviewsState,
  state,
  replace,
  reviewsArgs,
  sendReview,
} from './profileScreen.harness';
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

describe('MentorProfileScreen — Reviews tab', () => {
  it('has a Reviews (N) tab, and the header rating opens it', async () => {
    const user = userEvent.setup();
    h.profile = state({ data: fullProfile });
    render(<MentorProfileScreen handle="gbenga" />);
    expect(screen.getByRole('tab', { name: 'Reviews (7)' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /4\.9\s*\(7 reviews\)/ }));
    expect(replace).toHaveBeenCalledWith('/mentors/gbenga?tab=reviews', { scroll: false });
    // Nothing fetched until the tab is open.
    expect(reviewsArgs).toHaveBeenLastCalledWith(
      'gbenga',
      null,
      expect.objectContaining({ active: false }),
    );
  });

  it('a signed-in member can open Reviews with none yet — somebody writes the first', () => {
    // Bookings links a mentee straight here to review a session. Gating the tab
    // on `count > 0` dead-ended exactly that person on Overview, silently, with
    // no way to reach the form.
    h.search = new URLSearchParams('tab=reviews');
    h.profile = state({
      data: { ...fullProfile, reviews: { ...fullProfile.reviews, count: 0 } },
    });
    render(<MentorProfileScreen handle="gbenga" />);
    expect(screen.getByRole('tab', { name: /Reviews/ })).toHaveAttribute('aria-selected', 'true');
  });

  it('a guest gets no Reviews tab when there are none, and falls back to Overview', () => {
    h.isGuest = true;
    h.search = new URLSearchParams('tab=reviews');
    h.profile = state({
      data: { ...fullProfile, reviews: { ...fullProfile.reviews, count: 0 } },
    });
    render(<MentorProfileScreen handle="gbenga" />);
    expect(screen.queryByRole('tab', { name: /Reviews/ })).not.toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true');
  });

  it('shows the summary, the list and the aside without the track record', () => {
    h.search = new URLSearchParams('tab=reviews');
    h.profile = state({ data: fullProfile });
    h.reviewsRemote = reviewsState({ reviews, hasMore: true });
    render(<MentorProfileScreen handle="gbenga" />);
    expect(screen.getByText('9 in 10')).toBeInTheDocument();
    expect(screen.getByText('mentees would recommend Gbenga to a friend')).toBeInTheDocument();
    expect(screen.getAllByRole('article')).toHaveLength(5);
    // 7 reviews, 5 shown.
    expect(screen.getByRole('button', { name: 'Show 2 more reviews' })).toBeInTheDocument();
  });

  it('"Show N more" names what one click loads: at most a page', () => {
    h.search = new URLSearchParams('tab=reviews');
    h.profile = state({ data: { ...fullProfile, reviews: { ...fullProfile.reviews, count: 20 } } });
    h.reviewsRemote = reviewsState({ reviews, hasMore: true });
    render(<MentorProfileScreen handle="gbenga" />);
    expect(screen.getByRole('button', { name: 'Show 5 more reviews' })).toBeInTheDocument();
    expect(screen.queryByText('Track record')).not.toBeInTheDocument();
    expect(reviewsArgs).toHaveBeenLastCalledWith(
      'gbenga',
      null,
      expect.objectContaining({ guest: false, active: true, ready: true }),
    );
  });

  it('filters by session type', async () => {
    const user = userEvent.setup();
    h.search = new URLSearchParams('tab=reviews');
    h.profile = state({
      data: {
        ...fullProfile,
        sessionTypes: [
          fullProfile.sessionTypes[0]!,
          { ...fullProfile.sessionTypes[0]!, id: 'st9', name: 'Visa prep' },
        ],
      },
    });
    h.reviewsRemote = reviewsState({ reviews });
    render(<MentorProfileScreen handle="gbenga" />);
    const group = screen.getByRole('group', { name: 'Filter reviews by session' });
    expect(within(group).getByRole('button', { name: 'All' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await user.click(within(group).getByRole('button', { name: 'Visa prep' }));
    expect(reviewsArgs).toHaveBeenLastCalledWith('gbenga', 'st9', expect.anything());
  });

  it('a guest sees one review without its text, then the sign-up card', () => {
    h.isGuest = true;
    h.search = new URLSearchParams('tab=reviews');
    h.profile = state({ data: fullProfile });
    h.reviewsRemote = reviewsState({ reviews: [{ ...reviews[0]!, text: '' }] });
    render(<MentorProfileScreen handle="gbenga" />);
    expect(reviewsArgs).toHaveBeenLastCalledWith(
      'gbenga',
      null,
      expect.objectContaining({ guest: true }),
    );
    expect(
      screen.getByRole('img', { name: 'Review text hidden. Sign up to read it.' }),
    ).toBeInTheDocument();
    expect(screen.getByText('+6 more reviews from mentees')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Continue with email' })).toHaveAttribute(
      'href',
      '/signup?next=%2Fmentors%2Fgbenga%3Ftab%3Dreviews',
    );
    const gate = screen.getByRole('heading', {
      name: 'See what mentees say about Gbenga',
    }).parentElement!;
    expect(within(gate).getByRole('link', { name: 'Log in' })).toHaveAttribute(
      'href',
      '/login?next=%2Fmentors%2Fgbenga%3Ftab%3Dreviews',
    );
  });

  it('a mentee with no session yet is told when they can review, with a Book button', () => {
    h.search = new URLSearchParams('tab=reviews');
    h.profile = state({ data: fullProfile });
    h.reviewPrompt = 'none';
    render(<MentorProfileScreen handle="gbenga" />);
    expect(screen.getByText('You can review Gbenga after your first session')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Book a session' }).length).toBeGreaterThan(1);
  });

  it('a mentee with a review due is asked, without a button yet', () => {
    h.search = new URLSearchParams('tab=reviews');
    h.profile = state({ data: fullProfile });
    h.reviewPrompt = 'due';
    render(<MentorProfileScreen handle="gbenga" />);
    expect(screen.getByText('How was your session with Gbenga?')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Write a review' })).not.toBeInTheDocument();
  });

  it('a failed list says so and retries (error before empty)', async () => {
    const user = userEvent.setup();
    h.search = new URLSearchParams('tab=reviews');
    h.profile = state({ data: fullProfile });
    const retry = vi.fn();
    h.reviewsRemote = reviewsState({ error: { kind: 'server', message: 'x' }, retry });
    render(<MentorProfileScreen handle="gbenga" />);
    expect(screen.getByText('We couldn’t load reviews')).toBeInTheDocument();
    expect(screen.queryByText('No reviews for this session yet.')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalled();
  });
});

describe('MentorProfileScreen — writing a review', () => {
  const due = () => {
    h.search = new URLSearchParams('tab=reviews');
    h.profile = state({ data: fullProfile });
    h.reviewPrompt = 'due';
    h.reviewableRemote = remote([
      { id: 's1', startsAt: '2026-09-19T15:00:00Z', typeName: 'SOP draft review' },
    ]);
  };

  it('Escape in the open session list folds it; the review stays open (review of PR 112)', async () => {
    const user = userEvent.setup();
    due();
    h.reviewableRemote = remote([
      { id: 's1', startsAt: '2026-09-19T15:00:00Z', typeName: 'SOP draft review' },
      { id: 's2', startsAt: '2026-09-10T15:00:00Z', typeName: 'CV review' },
    ]);
    render(<MentorProfileScreen handle="gbenga" />);
    await user.click(screen.getByRole('button', { name: 'Write a review' }));
    const dialog = screen.getByRole('dialog', { name: 'How was your session with Gbenga?' });
    await user.click(within(dialog).getByRole('textbox'));
    await user.paste('Draft that must survive.');
    await user.click(within(dialog).getByRole('button', { name: /^Change session/ }));
    await user.click(within(dialog).getByRole('radio', { name: 'SOP draft review, Sep 19' }));
    await user.click(within(dialog).getByRole('button', { name: /^Change session/ }));
    await new Promise((r) => requestAnimationFrame(r));
    await user.keyboard('{Escape}');
    expect(
      screen.getByRole('dialog', { name: 'How was your session with Gbenga?' }),
    ).toBeInTheDocument();
    expect(within(dialog).getByRole('textbox')).toHaveValue('Draft that must survive.');
    // A second Escape, with the list folded, closes the modal as before.
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it(
    '"Write a review" opens the flow; it sends once, with the session',
    { timeout: 15_000 },
    async () => {
      const user = userEvent.setup();
      due();
      render(<MentorProfileScreen handle="gbenga" />);
      await user.click(screen.getByRole('button', { name: 'Write a review' }));
      const dialog = screen.getByRole('dialog', { name: 'How was your session with Gbenga?' });
      expect(within(dialog).getByText('Pick a rating to continue.')).toBeInTheDocument();
      await user.click(within(dialog).getByRole('radio', { name: '5 stars, Excellent' }));
      await user.click(within(dialog).getByRole('textbox'));
      await user.paste('We rewrote my SOP opening together and it finally reads well.');
      await user.click(within(dialog).getByRole('button', { name: 'Continue' }));
      for (const q of [
        'How clearly did Gbenga communicate ideas and advice?',
        'How knowledgeable was Gbenga on the topics you discussed?',
        'How supported did you feel during the session?',
        'How practical were the suggestions you received?',
      ]) {
        await user.click(
          within(screen.getByRole('radiogroup', { name: q })).getByRole('radio', { name: 'Great' }),
        );
      }
      await user.click(screen.getByRole('button', { name: 'Continue' }));
      await user.click(
        within(
          screen.getByRole('radiogroup', {
            name: 'How much did this session move you toward your study abroad goals?',
          }),
        ).getByRole('radio', {
          name: '5',
        }),
      );
      await user.click(
        within(
          screen.getByRole('radiogroup', {
            name: 'How likely are you to recommend Gbenga to a friend?',
          }),
        ).getByRole('radio', {
          name: '10',
        }),
      );
      await user.dblClick(screen.getByRole('button', { name: 'Submit review' }));
      expect(sendReview).toHaveBeenCalledTimes(1);
      expect(sendReview.mock.calls[0]![0]).toMatchObject({
        mode: 'new',
        mentorId: 'm1',
        sessionId: 's1',
        answers: { overall: 5, communication: 'great', value: 5, recommend: 10 },
      });
    },
  );

  it('no "Write a review" when there is no session left to review', () => {
    due();
    h.reviewableRemote = remote([]);
    render(<MentorProfileScreen handle="gbenga" />);
    expect(screen.getByText('How was your session with Gbenga?')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Write a review' })).not.toBeInTheDocument();
  });

  it(
    'after submitting: "Thanks, your review is live", and the review can be edited',
    { timeout: 15_000 },
    async () => {
      const user = userEvent.setup();
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date('2026-09-29T12:00:00Z'));
      h.search = new URLSearchParams('tab=reviews');
      h.profile = state({ data: fullProfile });
      h.myReviewRemote = remote({
        id: 'r7',
        createdAt: '2026-09-29T11:55:00Z',
        editableUntil: '2026-09-29T12:05:00Z',
        answers: { overall: 4, text: 'Practical, direct feedback on my SOP draft.' },
      });
      h.reviewsRemote = reviewsState({ reviews });
      render(<MentorProfileScreen handle="gbenga" />);
      expect(screen.getByText('Thanks, your review is live')).toBeInTheDocument();
      // The list marks the viewer's own review (r7) as editable.
      expect(screen.getByText(/^Editable until/)).toBeInTheDocument();
      expect(screen.getByText('Your review')).toBeInTheDocument();
      // A copy fetched after Edit opens (the screen won't start from an older one).
      h.authoredRemote = {
        ...remote(h.myReviewRemote.data!),
        fetchedAt: Number.MAX_SAFE_INTEGER,
        failedAt: 0,
      };
      await user.click(screen.getByRole('button', { name: 'Edit review' }));
      expect(screen.getByRole('dialog', { name: 'Edit your review' })).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: '4 stars, Great' })).toHaveAttribute(
        'aria-checked',
        'true',
      );
      vi.useRealTimers();
    },
  );

  it('the "no session yet" note\'s Book scrolls to the booking card (design change)', async () => {
    const user = userEvent.setup();
    h.search = new URLSearchParams('tab=reviews');
    h.profile = state({ data: fullProfile });
    h.reviewPrompt = 'none';
    const scroll = vi.fn();
    Element.prototype.scrollIntoView = scroll;
    render(<MentorProfileScreen handle="gbenga" />);
    const note = screen
      .getByText('You can review Gbenga after your first session')
      .closest('div')!.parentElement!;
    await user.click(within(note).getByRole('button', { name: 'Book a session' }));
    expect(scroll).toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('MentorProfileScreen — editing a review (review of #59)', () => {
  const T0 = new Date('2026-09-29T12:00:00Z');
  const open = (over: Partial<MyReview['answers']> = {}): MyReview => ({
    id: 'r7',
    createdAt: '2026-09-29T11:58:00Z',
    editableUntil: '2026-09-29T12:08:00Z',
    answers: { overall: 4, text: 'Practical, direct feedback on my SOP draft.', ...over },
  });
  const full = (overall: number): MyReview => ({
    ...open(),
    answers: {
      overall,
      text: 'Practical, direct feedback on my SOP draft.',
      communication: 'great',
      knowledge: 'great',
      support: 'okay',
      practicality: 'great',
      value: 4,
      recommend: 9,
      platformNote: '',
    },
  });
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(T0);
    h.search = new URLSearchParams('tab=reviews');
    h.profile = state({ data: fullProfile });
  });
  afterEach(() => vi.useRealTimers());

  it('never starts the form from a stale cached copy; the fresh one seeds it and is what saving compares to', async () => {
    const user = userEvent.setup();
    h.myReviewRemote = remote(open());
    // A cached copy from before the last save (4 stars), fetched before Edit opened.
    h.authoredRemote = { ...remote(full(4)), fetchedAt: T0.getTime() - 60_000, failedAt: 0 };
    const { rerender } = render(<MentorProfileScreen handle="gbenga" />);
    await user.click(screen.getByRole('button', { name: 'Edit review' }));
    expect(screen.getByText('Loading your review')).toBeInTheDocument();
    expect(screen.queryByRole('radiogroup', { name: /rate your time/ })).not.toBeInTheDocument();
    // The fresh copy lands: 2 stars (the last save).
    h.authoredRemote = { ...remote(full(2)), fetchedAt: T0.getTime() + 1, failedAt: 0 };
    rerender(<MentorProfileScreen handle="gbenga" />);
    expect(screen.getByRole('radio', { name: '2 stars, Fair' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(sendReview.mock.calls[0]![0]).toMatchObject({
      mode: 'edit',
      before: { overall: 2 },
      answers: { overall: 2 },
    });
  });

  it('a failed load says so and retries', async () => {
    const user = userEvent.setup();
    h.myReviewRemote = remote(open());
    const retry = vi.fn();
    h.authoredRemote = {
      ...remote<MyReview>(null as unknown as MyReview),
      data: null,
      error: { kind: 'server', message: 'x' },
      retry,
      fetchedAt: 0,
      failedAt: 0,
    };
    const { rerender } = render(<MentorProfileScreen handle="gbenga" />);
    await user.click(screen.getByRole('button', { name: 'Edit review' }));
    h.authoredRemote = { ...h.authoredRemote, failedAt: T0.getTime() + 1 };
    rerender(<MentorProfileScreen handle="gbenga" />);
    expect(screen.getByRole('alert')).toHaveTextContent('We couldn’t load your review');
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalled();
  });

  it('the "live" note and Edit go away on their own at the deadline', () => {
    // Fake the timer too: the page re-renders at the deadline.
    vi.useFakeTimers({ toFake: ['Date', 'setTimeout', 'clearTimeout'] });
    vi.setSystemTime(T0);
    h.myReviewRemote = remote(open());
    h.reviewsRemote = reviewsState({ reviews });
    render(<MentorProfileScreen handle="gbenga" />);
    expect(screen.getByText('Thanks, your review is live')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(8 * 60_000 + 100);
    });
    expect(screen.queryByText('Thanks, your review is live')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Edit/ })).not.toBeInTheDocument();
  });

  it('once the window has shut, no "live" note and no Edit, whatever was fetched', () => {
    vi.setSystemTime(new Date('2026-09-29T12:09:00Z'));
    h.myReviewRemote = remote(open());
    h.reviewsRemote = reviewsState({ reviews });
    render(<MentorProfileScreen handle="gbenga" />);
    expect(screen.queryByText('Thanks, your review is live')).not.toBeInTheDocument();
    expect(screen.queryByText(/^Editable until/)).not.toBeInTheDocument();
    expect(screen.getByText('Your review')).toBeInTheDocument();
  });
});
