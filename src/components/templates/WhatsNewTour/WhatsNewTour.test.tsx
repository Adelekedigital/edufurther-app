import { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MIGRATION_2026_11, type TourRoleContent } from '@/lib/copy/whatsNew';
import type { TourEvent } from './WhatsNewTour';

const h = vi.hoisted(() => ({ phone: false }));
vi.mock('@/lib/utils/useMediaQuery', () => ({ useMediaQuery: () => h.phone }));
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
  targets,
  holds = '',
  install = null,
  onInstall,
  onEvent,
  onClose,
}: {
  content: TourRoleContent;
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
) {
  const user = userEvent.setup();
  const onEvent = vi.fn<(e: TourEvent) => void>();
  const onClose = vi.fn();
  const onInstall = vi.fn();
  render(
    <Harness
      content={content}
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

describe('WhatsNewTour: the welcome', () => {
  it('is a dialog named for the viewer, with Show me around focused', async () => {
    await start(mentee, MENTEE_TARGETS);
    const dlg = screen.getByRole('dialog', { name: 'Welcome to the new EduFurther, Ada' });
    expect(dlg).toHaveAttribute('aria-modal', 'true');
    expect(within(dlg).getByText('New platform')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Show me around' })).toHaveFocus();
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

  it('with no step on the page, Show me around goes straight to done', async () => {
    const { user, onEvent } = await start(mentee, []);
    await user.click(screen.getByRole('button', { name: 'Show me around' }));
    expect(onEvent).toHaveBeenCalledWith({ type: 'finished' });
    expect(screen.getByRole('status')).toHaveTextContent('You’re all set');
  });

  it('a mentor’s done card leads to Calendar: Check my hours (focused) closes it as cta', async () => {
    const { user, onEvent, onClose } = await start(mentor, []);
    await user.click(screen.getByRole('button', { name: 'Show me around' }));
    const done = screen.getByRole('status');
    const cta = within(done).getByRole('link', { name: 'Check my hours' });
    expect(cta).toHaveAttribute('href', '/calendar');
    expect(cta).toHaveFocus();
    expect(within(done).getByRole('button', { name: 'Got it' })).toBeInTheDocument();
    await user.click(cta);
    expect(onEvent).toHaveBeenLastCalledWith({ type: 'completed', action: 'cta' });
    expect(onClose).toHaveBeenCalled();
  });

  it('a mentor’s Got it and Escape close it as dismiss', async () => {
    const { user, onEvent } = await start(mentor, []);
    await user.click(screen.getByRole('button', { name: 'Show me around' }));
    await user.keyboard('{Escape}');
    expect(onEvent).toHaveBeenLastCalledWith({ type: 'completed', action: 'dismiss' });
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

  it('on desktop the same step says Sessions only, and never opens More', async () => {
    const { user } = await start(mentor, ['nav-calendar', 'nav-sessions', 'nav-bookings']);
    await user.click(screen.getByRole('button', { name: 'Show me around' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('Find it under Sessions.');
    expect(screen.getByRole('button', { name: 'More' })).toHaveAttribute('aria-expanded', 'false');
  });
});
