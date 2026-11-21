import { useState } from 'react';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  MIGRATION_2026_11,
  WELCOME_2026_11,
  type TourLabels,
  type TourRoleContent,
} from '@/lib/copy/whatsNew';
import type { TourEvent } from './WhatsNewTour';

const h = vi.hoisted(() => ({ phone: false, listeners: new Set<() => void>() }));
vi.mock('@/lib/utils/useMediaQuery', async () => {
  const { useSyncExternalStore } = await import('react');
  return {
    useMediaQuery: () =>
      useSyncExternalStore(
        (cb: () => void) => {
          h.listeners.add(cb);
          return () => h.listeners.delete(cb);
        },
        () => h.phone,
      ),
  };
});
/** Turns the phone: the layout crosses 768px. */
const turn = (phone: boolean) =>
  act(() => {
    h.phone = phone;
    h.listeners.forEach((l) => l());
  });
const msg = vi.hoisted(() => ({ live: false }));
vi.mock('@/lib/config/messages', () => ({
  get MESSAGES_LIVE() {
    return msg.live;
  },
}));
const { WhatsNewTour } = await import('./WhatsNewTour');

const mentee = MIGRATION_2026_11.roles.mentee!;
const mentor = MIGRATION_2026_11.roles.mentor!;

// jsdom lays nothing out: an element "shows" unless it is marked hidden.
beforeAll(() => {
  vi.spyOn(HTMLElement.prototype, 'getClientRects').mockImplementation(function (
    this: HTMLElement,
  ) {
    return (this.closest('[hidden]') ? [] : [{}]) as unknown as DOMRectList;
  });
  // useFocusTrap skips what has no offsetParent (hidden): here, nothing is.
  vi.spyOn(HTMLElement.prototype, 'offsetParent', 'get').mockImplementation(function (
    this: HTMLElement,
  ) {
    return this.parentElement;
  });
});
afterAll(() => vi.restoreAllMocks());
beforeEach(() => {
  h.phone = false;
});

/** A stand-in shell: the targets by id, and a More sheet the tour can hold open. */
function Harness({
  content,
  labels,
  targets,
  holds = '',
  install = null,
  onInstall,
  onEvent,
  onClose,
}: {
  content: TourRoleContent;
  labels?: Pick<TourLabels, 'badge' | 'welcomeTitle'>;
  targets: string[];
  holds?: string;
  install?: 'android' | 'ios' | null;
  onInstall?: () => void;
  onEvent: (e: TourEvent) => void;
  onClose: () => void;
}) {
  const [more, setMore] = useState(false);
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open tour
      </button>
      {targets.map((t) => (
        <button key={t} type="button" data-tour={t}>
          {t}
        </button>
      ))}
      <button type="button" data-tour="nav-more" data-tour-holds={holds} aria-expanded={more}>
        More
      </button>
      {more && (
        <a href="/session-types" data-tour="nav-sessions">
          Sessions
        </a>
      )}
      {open && (
        <WhatsNewTour
          first="Ada"
          content={content}
          labels={labels}
          onEvent={onEvent}
          onMore={setMore}
          install={install}
          onInstall={onInstall}
          onClose={() => {
            setOpen(false);
            onClose();
          }}
        />
      )}
    </>
  );
}

async function start(
  content: TourRoleContent,
  targets: string[],
  holds?: string,
  install: 'android' | 'ios' | null = null,
  labels?: Pick<TourLabels, 'badge' | 'welcomeTitle'>,
) {
  const user = userEvent.setup();
  const onEvent = vi.fn<(e: TourEvent) => void>();
  const onClose = vi.fn();
  const onInstall = vi.fn();
  render(
    <Harness
      content={content}
      labels={labels}
      targets={targets}
      holds={holds}
      install={install}
      onInstall={onInstall}
      onEvent={onEvent}
      onClose={onClose}
    />,
  );
  const opener = screen.getByRole('button', { name: 'Open tour' });
  opener.focus();
  await user.click(opener);
  return { user, onEvent, onClose, onInstall, opener };
}

const MENTEE_TARGETS = ['nav-home', 'nav-bookings', 'credits-pill'];

/** Show me around, then Finish on the only step there is. */
async function toDoneCard(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Show me around' }));
  await user.click(screen.getByRole('button', { name: 'Finish' }));
}

describe('WhatsNewTour: the welcome', () => {
  it('is a dialog named for the viewer, with Show me around focused', async () => {
    await start(mentee, MENTEE_TARGETS);
    const dlg = screen.getByRole('dialog', { name: 'Welcome to the new EduFurther, Ada' });
    expect(dlg).toHaveAttribute('aria-modal', 'true');
    expect(within(dlg).getByText('New platform')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show me around' })).toHaveFocus();
  });

  it('names messages only while Messages is on', () => {
    const welcome = () =>
      render(
        <WhatsNewTour
          first="Ada"
          content={mentee}
          onEvent={vi.fn()}
          onMore={vi.fn()}
          onClose={vi.fn()}
        />,
      );
    // On the page before the tour opens, as the shell is.
    render(
      <button type="button" data-tour="nav-home">
        Home
      </button>,
    );
    const { unmount } = welcome();
    expect(screen.getByRole('dialog')).toHaveAccessibleDescription(
      'Your profile and bookings came with you. A few things work differently now.',
    );
    unmount();
    msg.live = true;
    try {
      welcome();
      expect(screen.getByRole('dialog')).toHaveAccessibleDescription(
        'Your profile, bookings and any messages you had came with you. A few things work differently now.',
      );
    } finally {
      msg.live = false;
    }
  });

  it('Not now skips at step 0 and closes, focus back where it was', async () => {
    const { user, onEvent, onClose, opener } = await start(mentee, MENTEE_TARGETS);
    await user.click(screen.getByRole('button', { name: 'Not now' }));
    expect(onEvent).toHaveBeenCalledWith({ type: 'skipped', step: 0 });
    expect(onClose).toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it('Escape is Not now', async () => {
    const { user, onEvent, onClose } = await start(mentee, MENTEE_TARGETS);
    await user.keyboard('{Escape}');
    expect(onEvent).toHaveBeenCalledWith({ type: 'skipped', step: 0 });
    expect(onClose).toHaveBeenCalled();
  });
});

describe('WhatsNewTour: the steps', () => {
  it('Next and Back move between steps; each step is announced once', async () => {
    const { user, onEvent } = await start(mentee, MENTEE_TARGETS);
    await user.click(screen.getByRole('button', { name: 'Show me around' }));
    expect(onEvent).toHaveBeenCalledWith({ type: 'started' });

    const dlg = screen.getByRole('dialog', { name: 'Your matches and your progress' });
    expect(within(dlg).getByText('Step 1 of 3')).toBeInTheDocument();
    expect(dlg).toHaveAccessibleDescription(/Highlighted: Home\.$/);
    expect(within(dlg).queryByRole('button', { name: 'Back' })).not.toBeInTheDocument();
    expect(within(dlg).getByRole('button', { name: 'Next' })).toHaveFocus();
    expect(onEvent).toHaveBeenCalledWith({ type: 'step', step: 1, target: 'nav-home' });

    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('dialog', { name: 'Join sessions from Bookings' })).toBeInTheDocument();
    expect(screen.getByText('Step 2 of 3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next' })).toHaveFocus();
    // The target is lit while its step shows.
    expect(document.querySelector('[data-tour="nav-bookings"]')).toHaveAttribute(
      'data-tour-active',
    );

    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();
    expect(document.querySelector('[data-tour="nav-bookings"]')).not.toHaveAttribute(
      'data-tour-active',
    );
  });

  it('keeps Tab inside the card', async () => {
    const { user } = await start(mentee, MENTEE_TARGETS);
    await user.click(screen.getByRole('button', { name: 'Show me around' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    // Skip, Back, Next: Tab from the last wraps to the first.
    expect(screen.getByRole('button', { name: 'Next' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Skip' })).toHaveFocus();
    await user.tab({ shift: true });
    expect(screen.getByRole('button', { name: 'Next' })).toHaveFocus();
  });

  it('Escape on a step skips at that step, and marks nothing more', async () => {
    const { user, onEvent, onClose } = await start(mentee, MENTEE_TARGETS);
    await user.click(screen.getByRole('button', { name: 'Show me around' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.keyboard('{Escape}');
    expect(onEvent).toHaveBeenLastCalledWith({ type: 'skipped', step: 2 });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('a step with no target is dropped and the count is of 2; Finish shows the done card', async () => {
    const { user, onEvent, onClose, opener } = await start(mentee, ['nav-home', 'nav-bookings']);
    await user.click(screen.getByRole('button', { name: 'Show me around' }));
    expect(screen.getByText('Step 1 of 2')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('button', { name: 'Finish' }));
    expect(onEvent).toHaveBeenCalledWith({ type: 'finished' });

    const done = screen.getByRole('status');
    expect(within(done).getByText('You’re all set')).toBeInTheDocument();
    // The mentee's card has one button.
    expect(within(done).getAllByRole('button')).toHaveLength(1);
    expect(within(done).queryByRole('link')).toBeNull();
    expect(within(done).getByRole('button', { name: 'Got it' })).toHaveFocus();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await user.click(within(done).getByRole('button', { name: 'Got it' }));
    expect(onEvent).toHaveBeenLastCalledWith({ type: 'completed', action: 'dismiss' });
    expect(onClose).toHaveBeenCalled();
    expect(opener).toHaveFocus();
  });

  it('with no step on the page, it closes at once and is not marked seen', async () => {
    const { onEvent, onClose } = await start(mentee, []);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(onEvent).not.toHaveBeenCalledWith({ type: 'finished' });
    expect(onEvent).not.toHaveBeenCalledWith({ type: 'opened' });
  });

  it('a required target missing holds it back the same way', async () => {
    const req = { ...mentee, steps: mentee.steps.map((s) => ({ ...s, required: true })) };
    const { onEvent, onClose } = await start(req, ['nav-home', 'nav-bookings']);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onEvent).not.toHaveBeenCalledWith({ type: 'finished' });
  });

  it('with steps to show, it says it opened (the caller claims the visit then)', async () => {
    const { onEvent } = await start(mentee, MENTEE_TARGETS);
    expect(onEvent).toHaveBeenCalledWith({ type: 'opened' });
  });

  it('a mentor’s done card leads to Calendar: Check my hours (focused) closes it as cta', async () => {
    const { user, onEvent, onClose } = await start(mentor, [], '', 'android');
    await toDoneCard(user);
    const done = screen.getByRole('status');
    // Mounted already filled: the focused button carries the words.
    expect(within(done).getByRole('link', { name: 'Check my hours' })).toHaveAccessibleDescription(
      'You’re all set Check your hours in Calendar so mentees can book you. You can replay this tour from the menu.',
    );
    const cta = within(done).getByRole('link', { name: 'Check my hours' });
    expect(cta).toHaveAttribute('href', '/calendar');
    expect(cta).toHaveFocus();
    expect(within(done).getByRole('button', { name: 'Got it' })).toBeInTheDocument();
    await user.click(cta);
    expect(onEvent).toHaveBeenLastCalledWith({ type: 'completed', action: 'cta' });
    expect(onClose).toHaveBeenCalled();
  });

  it('a mentor’s Got it and Escape close it as dismiss', async () => {
    const { user, onEvent } = await start(mentor, [], '', 'android');
    await toDoneCard(user);
    await user.keyboard('{Escape}');
    expect(onEvent).toHaveBeenLastCalledWith({ type: 'completed', action: 'dismiss' });
  });
});

describe('WhatsNewTour: the replay line', () => {
  it('while the replay is offered, the hint and done card say so', async () => {
    const { user } = await start(mentee, [], '', 'android');
    expect(
      screen.getByText('Takes about a minute. You can replay it from the menu.'),
    ).toBeInTheDocument();
    await toDoneCard(user);
    expect(screen.getByRole('status')).toHaveTextContent('You can replay this tour from the menu.');
  });

  it('once it is not, neither mentions it', async () => {
    const user = userEvent.setup();
    render(
      <button type="button" data-tour="nav-home">
        Home
      </button>,
    );
    render(
      <>
        <WhatsNewTour
          first="Ada"
          content={{ ...mentee, steps: mentee.steps.slice(0, 1) }}
          replayable={false}
          onEvent={vi.fn()}
          onMore={vi.fn()}
          onClose={vi.fn()}
        />
      </>,
    );
    expect(screen.getByText('Takes about a minute.')).toBeInTheDocument();
    await toDoneCard(user);
    expect(screen.getByRole('status')).not.toHaveTextContent('replay');
  });
});

describe('WhatsNewTour: Get the app', () => {
  it('where the app can be installed: last, at the More tab, Install app opens the sheet then done', async () => {
    h.phone = true;
    const { user, onEvent, onInstall } = await start(mentee, MENTEE_TARGETS, undefined, 'android');
    await user.click(screen.getByRole('button', { name: 'Show me around' }));
    for (let i = 0; i < 3; i++) await user.click(screen.getByRole('button', { name: 'Next' }));
    const dlg = screen.getByRole('dialog', { name: 'Get the EduFurther app' });
    expect(within(dlg).getByText('Step 4 of 4')).toBeInTheDocument();
    expect(dlg).toHaveAccessibleDescription(/Highlighted: More\.$/);
    expect(onEvent).toHaveBeenCalledWith({ type: 'step', step: 4, target: 'nav-more' });
    expect(within(dlg).queryByRole('button', { name: 'Skip' })).toBeNull();
    expect(within(dlg).getByRole('button', { name: 'Finish' })).toBeInTheDocument();
    expect(within(dlg).getByRole('button', { name: 'Install app' })).toHaveFocus();
    await user.click(within(dlg).getByRole('button', { name: 'Install app' }));
    expect(onInstall).toHaveBeenCalledTimes(1);
    expect(onEvent).toHaveBeenCalledWith({ type: 'finished' });
    expect(screen.getByRole('status')).toHaveTextContent('You’re all set');
  });

  it('Finish skips the install and still finishes', async () => {
    const { user, onEvent, onInstall } = await start(mentor, [], '', 'ios');
    await user.click(screen.getByRole('button', { name: 'Show me around' }));
    const dlg = screen.getByRole('dialog', { name: 'Get the EduFurther app' });
    expect(within(dlg).getByText('Step 1 of 1')).toBeInTheDocument();
    expect(dlg).toHaveTextContent('Tap Share in Safari’s toolbar, then choose Add to Home Screen.');
    await user.click(within(dlg).getByRole('button', { name: 'Finish' }));
    expect(onInstall).not.toHaveBeenCalled();
    expect(onEvent).toHaveBeenCalledWith({ type: 'finished' });
  });

  it('where it can’t be installed (or already is), the step is dropped: of 3', async () => {
    const { user } = await start(mentee, MENTEE_TARGETS);
    await user.click(screen.getByRole('button', { name: 'Show me around' }));
    expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();
  });
});

describe('WhatsNewTour: a mentor on a phone', () => {
  it('step 2 opens the More sheet with Sessions lit, and closes it after', async () => {
    h.phone = true;
    const { user, onEvent } = await start(
      mentor,
      ['nav-calendar', 'nav-bookings'],
      'nav-messages nav-sessions nav-integration nav-settings',
    );
    const more = screen.getByRole('button', { name: 'More' });
    await user.click(screen.getByRole('button', { name: 'Show me around' }));
    expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();
    expect(more).toHaveAttribute('aria-expanded', 'false');

    await user.click(screen.getByRole('button', { name: 'Next' }));
    const dlg = screen.getByRole('dialog', { name: 'Create your own sessions' });
    expect(more).toHaveAttribute('aria-expanded', 'true');
    expect(dlg).toHaveTextContent('Find it under More, then Sessions.');
    expect(dlg).toHaveAccessibleDescription(/Highlighted: Sessions\.$/);
    expect(onEvent).toHaveBeenCalledWith({ type: 'step', step: 2, target: 'nav-sessions' });
    await vi.waitFor(() =>
      expect(document.querySelector('[data-tour="nav-sessions"]')).toHaveAttribute(
        'data-tour-active',
      ),
    );

    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(more).toHaveAttribute('aria-expanded', 'false');
  });

  it('turning the phone across 768px on the Sessions step moves it between More and the rail', async () => {
    h.phone = true;
    const { user } = await start(
      mentor,
      ['nav-calendar', 'nav-bookings'],
      'nav-messages nav-sessions nav-integration nav-settings',
    );
    const more = screen.getByRole('button', { name: 'More' });
    await user.click(screen.getByRole('button', { name: 'Show me around' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(more).toHaveAttribute('aria-expanded', 'true');
    // Wider: the rail's Sessions is on screen, the sheet lets go.
    const rail = document.createElement('a');
    rail.setAttribute('data-tour', 'nav-sessions');
    document.body.appendChild(rail);
    try {
      turn(false);
      expect(more).toHaveAttribute('aria-expanded', 'false');
      expect(screen.getByRole('dialog')).toHaveTextContent('Find it under Sessions.');
      rail.remove();
      turn(true);
      expect(more).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByRole('dialog')).toHaveTextContent('Find it under More, then Sessions.');
    } finally {
      rail.remove();
    }
  });

  it('on desktop the same step says Sessions only, and never opens More', async () => {
    const { user } = await start(mentor, ['nav-calendar', 'nav-sessions', 'nav-bookings']);
    await user.click(screen.getByRole('button', { name: 'Show me around' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('Find it under Sessions.');
    expect(screen.getByRole('button', { name: 'More' })).toHaveAttribute('aria-expanded', 'false');
  });
});

describe('WhatsNewTour: the Welcome tour (accounts made here)', () => {
  const w = WELCOME_2026_11;
  const labels = w.labels as TourLabels;

  it('the welcome wears the release’s own badge and title', async () => {
    await start(w.roles.mentee!, ['nav-home'], undefined, null, labels);
    const dlg = screen.getByRole('dialog', { name: 'Welcome to EduFurther, Ada' });
    expect(within(dlg).getByText('Welcome')).toBeInTheDocument();
    expect(within(dlg).queryByText('New platform')).toBeNull();
  });

  it('a step with no badge shows only its count', async () => {
    const { user } = await start(w.roles.mentee!, ['nav-home'], undefined, null, labels);
    await user.click(screen.getByRole('button', { name: 'Show me around' }));
    const step = screen.getByRole('dialog', { name: 'Your matches and your progress' });
    expect(step.textContent).toMatch(/^Step 1 of 1Your matches and your progress/);
  });

  it('the mentee’s done card leads to Explore: Find a mentor, with the replay line', async () => {
    const { user, onEvent } = await start(w.roles.mentee!, ['nav-home'], undefined, null, labels);
    await toDoneCard(user);
    const done = screen.getByRole('status');
    const cta = within(done).getByRole('link', { name: 'Find a mentor' });
    expect(cta).toHaveAttribute('href', '/explore');
    expect(cta).toHaveFocus();
    expect(cta).toHaveAccessibleDescription(
      'You’re all set Find a mentor on Home or Explore and book your first session. You can replay this tour from the menu.',
    );
    await user.click(cta);
    expect(onEvent).toHaveBeenLastCalledWith({ type: 'completed', action: 'cta' });
  });
});
