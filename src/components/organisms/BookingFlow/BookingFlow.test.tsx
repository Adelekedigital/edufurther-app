import { useState } from 'react';
import { act, getDefaultNormalizer, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Mentor, Remote, SessionType } from '@/types/mentor';
import { BookingFlow, type BookingFlowProps } from './BookingFlow';
import {
  allKinds,
  mentor,
  pinToday,
  props,
  remote,
  sessionTypes,
  setPhone,
  slots,
} from './BookingFlow.testkit';

pinToday();

describe('BookingFlow on phones (sheet)', () => {
  beforeEach(() => setPhone(true));

  it('the session summary says it’s free and uses a credit', () => {
    render(<BookingFlow {...props()} />);
    // No-break spaces keep "60 min" and "1 credit" whole.
    expect(
      screen.getByText(/· \d+\u00a0min · Free · 1\u00a0credit$/, {
        normalizer: getDefaultNormalizer({ collapseWhitespace: false }),
      }),
    ).toBeInTheDocument();
  });

  it('starts with close on the left and no close on the right', () => {
    render(<BookingFlow {...props()} />);
    const sheet = screen.getByTestId('sheet');
    expect(sheet).toHaveTextContent('Step 1 of 2');
    expect(sheet).toHaveTextContent('Pick a date and time');
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
    expect(sheet).not.toHaveTextContent('right close');
  });

  it('moves back to the header after step 1 and keeps one footer action', async () => {
    const user = userEvent.setup();
    render(<BookingFlow {...props()} />);
    await user.click(screen.getByRole('radio', { name: '9:00 am' }));
    await user.click(screen.getByRole('button', { name: 'Continue to questions' }));
    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument();
    expect(screen.getByTestId('sheet')).toHaveTextContent('right close');
    const footer = screen.getByTestId('footer');
    expect(footer.querySelectorAll('button')).toHaveLength(1);
  });

  it('shows no chosen-time row over the done, loading or error states', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<BookingFlow {...props()} />);
    await user.click(screen.getByRole('radio', { name: '9:00 am' }));
    await user.click(screen.getByRole('button', { name: 'Continue to questions' }));
    expect(screen.getByRole('button', { name: /^Change/ })).toBeInTheDocument();

    rerender(<BookingFlow {...props({ requestDone: true })} />);
    expect(screen.getByText('Request sent')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Change/ })).not.toBeInTheDocument();

    rerender(
      <BookingFlow
        {...props({ sessionTypes: remote<SessionType[]>(null, { isLoading: true }) })}
      />,
    );
    expect(screen.queryByRole('button', { name: /^Change/ })).not.toBeInTheDocument();

    rerender(
      <BookingFlow
        {...props({
          sessionTypes: remote<SessionType[]>(null, { error: { kind: 'server', message: 'x' } }),
        })}
      />,
    );
    expect(screen.queryByRole('button', { name: /^Change/ })).not.toBeInTheDocument();
  });

  it('opens on the given session type and can hide the profile link', async () => {
    const user = userEvent.setup();
    render(<BookingFlow {...props({ sessionTypeId: 'st2', hideProfileLink: true })} />);
    expect(screen.getByText('CV review')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /CV review/ }));
    expect(screen.queryByRole('link', { name: 'View profile' })).not.toBeInTheDocument();
  });

  it('the summary offers the session-type choice on step 1 only, and only with several types', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<BookingFlow {...props()} />);
    await user.click(screen.getByRole('button', { name: /General mentorship/ }));
    expect(screen.getByRole('combobox', { name: 'Session type' })).toBeInTheDocument();
    // Past the time step the answers belong to this type: no switching there.
    await user.click(screen.getByRole('radio', { name: '9:00 am' }));
    await user.click(screen.getByRole('button', { name: 'Continue to questions' }));
    expect(screen.getByRole('button', { name: /General mentorship/ })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.queryByRole('combobox', { name: 'Session type' })).not.toBeInTheDocument();
    unmount();

    render(
      <BookingFlow
        {...props({ sessionTypes: remote([sessionTypes[1]!]), sessionTypeId: 'st2' })}
      />,
    );
    await user.click(screen.getByRole('button', { name: /CV review/ }));
    expect(screen.queryByRole('combobox', { name: 'Session type' })).not.toBeInTheDocument();
  });
});

describe('BookingFlow on wider screens', () => {
  beforeEach(() => setPhone(false));

  it('hands over no sheet chrome and keeps Cancel and Next in the body', () => {
    render(<BookingFlow {...props()} />);
    expect(screen.queryByTestId('sheet')).not.toBeInTheDocument();
    expect(screen.queryByTestId('footer')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View profile' })).toBeInTheDocument();
  });

  it('with one session type, names it instead of offering a choice', () => {
    render(
      <BookingFlow
        {...props({ sessionTypes: remote([sessionTypes[1]!]), sessionTypeId: 'st2' })}
      />,
    );
    const aside = screen.getByRole('complementary', { name: 'Session' });
    expect(within(aside).queryByRole('combobox')).not.toBeInTheDocument();
    expect(within(aside).getByText('Session')).toBeInTheDocument();
    expect(within(aside).getByText('CV review')).toBeInTheDocument();
  });

  it('locks the session-type choice after the time step', async () => {
    const user = userEvent.setup();
    render(<BookingFlow {...props()} />);
    expect(screen.getByRole('combobox', { name: 'Session type' })).toBeEnabled();
    await user.click(screen.getByRole('radio', { name: '9:00 am' }));
    await user.click(screen.getByRole('button', { name: 'Continue to questions' }));
    expect(screen.getByRole('combobox', { name: 'Session type' })).toBeDisabled();
  });

  it('shows the price, Free, and the credit it uses, next to the length', () => {
    render(<BookingFlow {...props()} />);
    const aside = screen.getByRole('complementary', { name: 'Session' });
    expect(within(aside).getByText('Price')).toBeInTheDocument();
    expect(within(aside).getByText('Free')).toBeInTheDocument();
    // The coin icon is decorative: hidden, so the tile reads "Price, Free, Uses 1 credit".
    const note = within(aside).getByText('Uses 1 credit');
    expect(note.querySelector('[aria-hidden="true"]')).toHaveTextContent('toll');
    expect(within(aside).queryByRole('img')).toBeNull();
    expect(aside).toHaveTextContent(/Length\s*\d+ min/);
  });
});

describe('BookingFlow on real slots', () => {
  beforeEach(() => setPhone(false));

  it('has no questions step when the offering asks none: the time step requests', async () => {
    const user = userEvent.setup();
    const onRequest = vi.fn();
    render(<BookingFlow {...props({ sessionTypeId: 'st2', onRequest })} />);
    // Design #39: one step → no "Step 1 of 1" caption and no step bar.
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.queryByText(/Step 1 of 1/)).not.toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: '9:00 am' }));
    await user.click(screen.getByRole('button', { name: /^Request Mon, Sep 28/ }));
    expect(onRequest).toHaveBeenCalledWith(
      expect.objectContaining({ sessionTypeId: 'st2', startsAt: '2026-09-28T09:00:00Z' }),
    );
  });

  it('a guest with no questions requests straight after signing up', async () => {
    const user = userEvent.setup();
    const onRequest = vi.fn();
    render(<BookingFlow {...props({ sessionTypeId: 'st2', isGuest: true, onRequest })} />);
    await user.click(screen.getByRole('radio', { name: '9:00 am' }));
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.type(screen.getByRole('textbox', { name: 'Email address' }), 'a@b.co');
    await user.click(screen.getByRole('button', { name: 'Continue with email' }));
    expect(onRequest).toHaveBeenCalledTimes(1);
  });

  it('a guest stays on step 2 of 2 while their request sends (review of #26)', async () => {
    const user = userEvent.setup();
    const reasons = [
      { icon: 'flight_takeoff' as const, k: 'Made the move you’re planning.', v: 'From A to B.' },
    ];
    const { rerender } = render(
      <BookingFlow {...props({ sessionTypeId: 'st2', isGuest: true, firstReasons: reasons })} />,
    );
    await user.click(screen.getByRole('radio', { name: '9:00 am' }));
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.type(screen.getByRole('textbox', { name: 'Email address' }), 'a@b.co');
    await user.click(screen.getByRole('button', { name: 'Continue with email' }));
    rerender(
      <BookingFlow
        {...props({
          sessionTypeId: 'st2',
          isGuest: true,
          firstReasons: reasons,
          requestPending: true,
        })}
      />,
    );
    expect(screen.getByRole('progressbar', { name: /Step 2 of 2/ })).toBeInTheDocument();
    expect(screen.queryByText(/first mentees/)).not.toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: '9:00 am' })).not.toBeInTheDocument();
  });

  it('a guest with questions stays on the questions while sending and after an error', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <BookingFlow {...props({ sessionTypeId: 'st1', isGuest: true })} />,
    );
    await user.click(screen.getByRole('radio', { name: '9:00 am' }));
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.type(screen.getByRole('textbox', { name: 'Email address' }), 'a@b.co');
    await user.click(screen.getByRole('button', { name: 'Continue with email' }));
    expect(screen.getByRole('progressbar', { name: /Step 3 of 3/ })).toBeInTheDocument();
    for (const over of [
      { requestPending: true },
      { requestError: { kind: 'offline', message: 'x' } as const },
    ]) {
      rerender(<BookingFlow {...props({ sessionTypeId: 'st1', isGuest: true, ...over })} />);
      expect(screen.getByRole('progressbar', { name: /Step 3 of 3/ })).toBeInTheDocument();
      expect(screen.queryByRole('textbox', { name: 'Email address' })).not.toBeInTheDocument();
      expect(screen.getByText('What would you like to cover?')).toBeInTheDocument();
    }
  });

  it('a guest error without questions stays on step 2, signed up, with a retry and no second sign-up', async () => {
    const user = userEvent.setup();
    const onSignup = vi.fn();
    const onRequest = vi.fn();
    const base = { sessionTypeId: 'st2', isGuest: true, onSignup, onRequest };
    const { rerender } = render(<BookingFlow {...props(base)} />);
    await user.click(screen.getByRole('radio', { name: '9:00 am' }));
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.type(screen.getByRole('textbox', { name: 'Email address' }), 'a@b.co');
    await user.click(screen.getByRole('button', { name: 'Continue with email' }));
    rerender(
      <BookingFlow {...props({ ...base, requestError: { kind: 'offline', message: 'x' } })} />,
    );
    expect(screen.getByRole('progressbar', { name: /Step 2 of 2/ })).toBeInTheDocument();
    // No second sign-up form: they're signed up, and the button retries.
    expect(screen.queryByRole('textbox', { name: 'Email address' })).not.toBeInTheDocument();
    expect(screen.getByText('Signed up as a@b.co')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^Request Mon, Sep 28/ }));
    expect(onRequest).toHaveBeenCalledTimes(2);
    expect(onSignup).toHaveBeenCalledTimes(1);
  });

  it('a double-click on "Continue with Google" books once (review r3 of #26)', async () => {
    const user = userEvent.setup();
    const onSignup = vi.fn();
    const onRequest = vi.fn();
    render(
      <BookingFlow {...props({ sessionTypeId: 'st2', isGuest: true, onSignup, onRequest })} />,
    );
    await user.click(screen.getByRole('radio', { name: '9:00 am' }));
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.dblClick(screen.getByRole('button', { name: 'Continue with Google' }));
    expect(onRequest).toHaveBeenCalledTimes(1);
    expect(onSignup).toHaveBeenCalledTimes(1);
  });

  it('a double-click on "Continue with email" books once (review r4 of #26)', async () => {
    const user = userEvent.setup();
    const onSignup = vi.fn();
    const onRequest = vi.fn();
    render(
      <BookingFlow {...props({ sessionTypeId: 'st2', isGuest: true, onSignup, onRequest })} />,
    );
    await user.click(screen.getByRole('radio', { name: '9:00 am' }));
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.type(screen.getByRole('textbox', { name: 'Email address' }), 'a@b.co');
    // The second click lands on the same footer button, now "Request …",
    // before the page's requestPending arrives.
    await user.dblClick(screen.getByRole('button', { name: 'Continue with email' }));
    expect(onRequest).toHaveBeenCalledTimes(1);
    expect(onSignup).toHaveBeenCalledTimes(1);
  });

  it('Back is disabled while a request is out', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<BookingFlow {...props({ sessionTypeId: 'st1' })} />);
    await user.click(screen.getByRole('radio', { name: '9:00 am' }));
    await user.click(screen.getByRole('button', { name: /^Continue/ }));
    rerender(<BookingFlow {...props({ sessionTypeId: 'st1', requestPending: true })} />);
    expect(screen.getByRole('button', { name: 'Back' })).toBeDisabled();
  });

  it('"Change" is disabled while a request is out (review r4 of #26)', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<BookingFlow {...props({ sessionTypeId: 'st1' })} />);
    await user.click(screen.getByRole('radio', { name: '9:00 am' }));
    await user.click(screen.getByRole('button', { name: /^Continue/ }));
    rerender(<BookingFlow {...props({ sessionTypeId: 'st1', requestPending: true })} />);
    expect(screen.getByRole('button', { name: /^Change/ })).toBeDisabled();
  });

  it('Cancel still closes while a request is out (review r4 of #26)', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<BookingFlow {...props({ sessionTypeId: 'st2', requestPending: true, onClose })} />);
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('going back after signing up skips the sign-up step', async () => {
    const user = userEvent.setup();
    render(<BookingFlow {...props({ sessionTypeId: 'st1', isGuest: true })} />);
    await user.click(screen.getByRole('radio', { name: '9:00 am' }));
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.type(screen.getByRole('textbox', { name: 'Email address' }), 'a@b.co');
    await user.click(screen.getByRole('button', { name: 'Continue with email' }));
    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByRole('progressbar', { name: /Step 1 of 3/ })).toBeInTheDocument();
    // And forward again goes straight to the questions.
    await user.click(screen.getByRole('button', { name: /^Continue/ }));
    expect(screen.getByText('What would you like to cover?')).toBeInTheDocument();
  });

  it('groups the days in the zone the viewer picked', () => {
    // 02:00Z on Sep 29 is still Sep 28 in New York.
    render(
      <BookingFlow
        {...props({ slots: remote(['2026-09-29T02:00:00Z']), deviceZone: 'America/New_York' })}
      />,
    );
    expect(screen.getByText('Mon, Sep 28 · 1 time')).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: '10:00 pm' })).toBeInTheDocument();
  });

  it('says so when the offering has no open times', () => {
    render(<BookingFlow {...props({ slots: remote([]) })} />);
    expect(screen.getByText('No open times at the moment')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pick a time' })).toBeDisabled();
  });

  it('shows a slots error with a retry', async () => {
    const user = userEvent.setup();
    const retry = vi.fn();
    render(
      <BookingFlow
        {...props({
          slots: remote<string[]>(null, { error: { kind: 'server', message: 'x' }, retry }),
        })}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(retry).toHaveBeenCalled();
  });

  it('asks the page for the other offering when the type changes', async () => {
    const user = userEvent.setup();
    const onSessionTypeChange = vi.fn();
    render(<BookingFlow {...props({ onSessionTypeChange })} />);
    await user.selectOptions(screen.getByRole('combobox', { name: 'Session type' }), 'st2');
    expect(onSessionTypeChange).toHaveBeenCalledWith('st2');
  });

  it('switching type starts it over: this week, no time chosen', async () => {
    const user = userEvent.setup();
    function Page() {
      const [typeId, setTypeId] = useState('st2');
      return (
        <BookingFlow
          {...props({
            sessionTypeId: typeId,
            onSessionTypeChange: setTypeId,
            slots: remote([...slots, '2026-10-06T09:00:00Z']),
          })}
        />
      );
    }
    render(<Page />);
    await user.click(screen.getByRole('button', { name: 'Later dates' }));
    await user.click(screen.getByRole('radio', { name: '9:00 am' })); // Tue, Oct 6
    expect(screen.getByRole('button', { name: /^Request Tue, Oct 6/ })).toBeEnabled();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Session type' }), 'st1');
    expect(screen.getByText('Next 7 days · Sep 27 – Oct 3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pick a time' })).toBeDisabled();
  });

  it('stays on the time step when a new time is picked after the old one was taken', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <BookingFlow {...props({ sessionTypeId: 'st2', isGuest: true })} />,
    );
    await user.click(screen.getByRole('radio', { name: '9:00 am' })); // Sep 28
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByRole('progressbar', { name: /Step 2 of 2/ })).toBeInTheDocument();

    // Slots reload without that time: back to the time step.
    rerender(
      <BookingFlow
        {...props({ sessionTypeId: 'st2', isGuest: true, slots: remote(['2026-09-29T13:00:00Z']) })}
      />,
    );
    expect(screen.getByRole('progressbar', { name: /Step 1 of 2/ })).toBeInTheDocument();

    // Picking the remaining time must not jump ahead to sign-up by itself.
    await user.click(screen.getByRole('radio', { name: '1:00 pm' }));
    expect(screen.getByRole('progressbar', { name: /Step 1 of 2/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled();
  });

  it('drops a chosen time the grid no longer offers (taken meanwhile)', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<BookingFlow {...props()} />);
    await user.click(screen.getByRole('radio', { name: '9:00 am' }));
    await user.click(screen.getByRole('button', { name: 'Continue to questions' }));
    rerender(<BookingFlow {...props({ slots: remote(['2026-09-29T13:00:00Z']) })} />);
    expect(screen.getByRole('progressbar', { name: /Step 1 of 2/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pick a time' })).toBeDisabled();
  });
});

describe('BookingFlow questions', () => {
  beforeEach(() => setPhone(false));

  describe('the questions step (backend PRs 268, 12, 282)', () => {
    const toQuestions = async (user: ReturnType<typeof userEvent.setup>) => {
      await user.click(screen.getByRole('radio', { name: '9:00 am' }));
      await user.click(screen.getByRole('button', { name: 'Continue to questions' }));
    };
    const cv = new File(['%PDF-1.7'], 'cv.pdf', { type: 'application/pdf' });

    it('asks every kind; required answers and a finished upload gate the request', async () => {
      const user = userEvent.setup();
      const onRequest = vi.fn();
      let finish: (f: { id: string; name: string; size: number }) => void = () => {};
      const onUpload = vi.fn(
        () => new Promise<{ id: string; name: string; size: number }>((r) => (finish = r)),
      );
      render(
        <BookingFlow
          {...props({ sessionTypes: remote(allKinds), sessionTypeId: 'st3', onRequest, onUpload })}
        />,
      );
      await toQuestions(user);
      const send = () => screen.getByRole('button', { name: /^Request Mon, Sep 28/ });
      expect(send()).toBeDisabled();

      await user.upload(screen.getByLabelText(/Upload your CV/), cv);
      expect(onUpload).toHaveBeenCalledWith(cv);
      expect(screen.getByText(/Uploading cv\.pdf/)).toBeInTheDocument();
      await user.click(screen.getByRole('radio', { name: 'PhD' }));
      // Still uploading: nothing sends.
      expect(send()).toBeDisabled();
      await act(async () => finish({ id: 'f1', name: 'cv.pdf', size: 8 }));
      expect(send()).toBeEnabled();

      await user.click(screen.getByRole('button', { name: 'Wording' }));
      await user.type(screen.getByRole('textbox', { name: 'Anything else?' }), 'Due Friday');
      await user.click(send());
      expect(onRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionTypeId: 'st3',
          answers: {
            qf: { file: { id: 'f1', name: 'cv.pdf', size: 8 } },
            qs: { optionIds: ['o2'] },
            qm: { optionIds: ['m2'] },
            qt: { text: 'Due Friday' },
          },
        }),
      );
    });

    it('a refused upload says why and can be retried with the same file', async () => {
      const user = userEvent.setup();
      const onUpload = vi
        .fn()
        .mockRejectedValueOnce({
          kind: 'validation',
          message: 'Upload a PDF or Word (.docx) file under 5 MB.',
        })
        .mockResolvedValueOnce({ id: 'f2', name: 'cv.pdf', size: 8 });
      render(
        <BookingFlow
          {...props({ sessionTypes: remote(allKinds), sessionTypeId: 'st3', onUpload })}
        />,
      );
      await toQuestions(user);
      await user.upload(screen.getByLabelText(/Upload your CV/), cv);
      expect(
        await screen.findByText('Upload a PDF or Word (.docx) file under 5 MB.'),
      ).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Try again' }));
      expect(onUpload).toHaveBeenLastCalledWith(cv);
      expect(await screen.findByText('cv.pdf attached')).toBeInTheDocument();
      expect(screen.queryByRole('alert')).toBeNull();
    });

    it('an upload that lands after a session-type switch is dropped, and nothing waits on it (review of #62)', async () => {
      const user = userEvent.setup();
      const onRequest = vi.fn();
      let finish: (f: { id: string; name: string; size: number }) => void = () => {};
      const onUpload = vi.fn(
        () => new Promise<{ id: string; name: string; size: number }>((r) => (finish = r)),
      );
      const types = [...allKinds, sessionTypes[1]!]; // st3 (every kind), st2 (none)
      function Harness() {
        const [typeId, setTypeId] = useState('st3');
        return (
          <BookingFlow
            {...props({
              sessionTypes: remote(types),
              sessionTypeId: typeId,
              onSessionTypeChange: setTypeId,
              onRequest,
              onUpload,
            })}
          />
        );
      }
      render(<Harness />);
      await toQuestions(user);
      await user.upload(screen.getByLabelText(/Upload your CV/), cv);
      await user.click(screen.getByRole('button', { name: 'Back' }));
      await user.selectOptions(screen.getByRole('combobox', { name: 'Session type' }), 'st2');
      await user.click(screen.getByRole('radio', { name: '9:00 am' }));
      const send = screen.getByRole('button', { name: /^Request Mon, Sep 28/ });
      // The other type's upload doesn't hold this one up.
      expect(send).toBeEnabled();
      await act(async () => finish({ id: 'f1', name: 'cv.pdf', size: 8 }));
      await user.click(send);
      expect(onRequest).toHaveBeenCalledWith(
        expect.objectContaining({ sessionTypeId: 'st2', answers: {} }),
      );
    });

    it('a refused answer to a question not on screen says so at the bottom', async () => {
      const user = userEvent.setup();
      const { rerender } = render(
        <BookingFlow {...props({ sessionTypes: remote(allKinds), sessionTypeId: 'st3' })} />,
      );
      await toQuestions(user);
      rerender(
        <BookingFlow
          {...props({
            sessionTypes: remote(allKinds),
            sessionTypeId: 'st3',
            requestError: { kind: 'validation', message: 'Check your answer.', questionId: 'gone' },
          })}
        />,
      );
      expect(screen.getByRole('alert')).toHaveTextContent('Check your answer.');
    });

    it('a file the server can’t use any more is dropped, so the field asks for it again', async () => {
      const user = userEvent.setup();
      const onUpload = vi.fn().mockResolvedValue({ id: 'f1', name: 'cv.pdf', size: 8 });
      const base = { sessionTypes: remote(allKinds), sessionTypeId: 'st3', onUpload };
      const { rerender } = render(<BookingFlow {...props(base)} />);
      await toQuestions(user);
      await user.upload(screen.getByLabelText(/Upload your CV/), cv);
      expect(await screen.findByText('cv.pdf attached')).toBeInTheDocument();
      rerender(
        <BookingFlow
          {...props({
            ...base,
            requestError: {
              kind: 'validation',
              message: 'Upload the file again: that one can’t be used any more.',
              questionId: 'qf',
              fileGone: true,
            },
          })}
        />,
      );
      expect(screen.queryByText('cv.pdf attached')).toBeNull();
      expect(screen.getByRole('alert')).toHaveTextContent('Upload the file again');
    });

    it('after "Upload the file again", the new file stays through the page re-rendering (review r2 of #62)', async () => {
      const user = userEvent.setup();
      const onUpload = vi
        .fn()
        .mockResolvedValueOnce({ id: 'f1', name: 'cv.pdf', size: 8 })
        .mockResolvedValueOnce({ id: 'f2', name: 'cv.pdf', size: 8 });
      // One error object, as the hook now returns; the page re-renders on its own.
      const gone = {
        kind: 'validation' as const,
        message: 'Upload the file again: that one can’t be used any more.',
        questionId: 'qf',
        fileGone: true,
      };
      let bump: () => void = () => {};
      function Page({ error }: { error: typeof gone | null }) {
        const [, setN] = useState(0);
        bump = () => setN((n) => n + 1);
        return (
          <BookingFlow
            {...props({
              sessionTypes: remote(allKinds),
              sessionTypeId: 'st3',
              onUpload,
              requestError: error,
            })}
          />
        );
      }
      const { rerender } = render(<Page error={null} />);
      await toQuestions(user);
      await user.upload(screen.getByLabelText(/Upload your CV/), cv);
      expect(await screen.findByText('cv.pdf attached')).toBeInTheDocument();
      rerender(<Page error={gone} />);
      expect(screen.queryByText('cv.pdf attached')).toBeNull();
      await user.upload(screen.getByLabelText(/Upload your CV/), cv);
      expect(await screen.findByText('cv.pdf attached')).toBeInTheDocument();
      act(() => bump());
      act(() => bump());
      expect(screen.getByText('cv.pdf attached')).toBeInTheDocument();
    });

    it('the file input stays focusable while uploading (review of #62)', async () => {
      const user = userEvent.setup();
      const onUpload = vi.fn(
        () => new Promise<{ id: string; name: string; size: number }>(() => {}),
      );
      render(
        <BookingFlow
          {...props({ sessionTypes: remote(allKinds), sessionTypeId: 'st3', onUpload })}
        />,
      );
      await toQuestions(user);
      const input = screen.getByLabelText(/Upload your CV/);
      await user.upload(input, cv);
      expect(input).not.toBeDisabled();
      expect(input).toHaveAttribute('aria-disabled', 'true');
      await user.upload(input, cv);
      expect(onUpload).toHaveBeenCalledTimes(1);
    });

    it('an answer the server refused shows under that question, not at the bottom', async () => {
      const user = userEvent.setup();
      const { rerender } = render(
        <BookingFlow {...props({ sessionTypes: remote(allKinds), sessionTypeId: 'st3' })} />,
      );
      await toQuestions(user);
      rerender(
        <BookingFlow
          {...props({
            sessionTypes: remote(allKinds),
            sessionTypeId: 'st3',
            requestError: {
              kind: 'validation',
              message: 'Check your answer to this question, then send again.',
              questionId: 'qs',
            },
          })}
        />,
      );
      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent('Check your answer to this question');
      expect(
        within(screen.getByRole('group', { name: /What is it for\?/ })).getByRole('alert'),
      ).toBe(alert);
    });
  });
});
