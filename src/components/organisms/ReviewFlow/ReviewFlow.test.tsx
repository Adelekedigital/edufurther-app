import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { ReviewFlow, type ReviewFlowProps } from './ReviewFlow';

const props = (over: Partial<ReviewFlowProps> = {}): ReviewFlowProps => ({
  mode: 'new',
  mentorFirstName: 'Gbenga',
  sessions: [{ id: 's1', startsAt: '2026-09-19T15:00:00Z', typeName: 'SOP draft review' }],
  editableUntil: null,
  author: { name: 'Esther', initials: 'E', institution: null },
  timeZone: 'UTC',
  onSend: vi.fn(),
  pending: false,
  error: null,
  done: false,
  onClose: vi.fn(),
  renderShell: (shell, body: ReactNode) => (
    <div role="dialog" aria-label={shell.title}>
      <p>{shell.subtitle}</p>
      {body}
    </div>
  ),
  ...over,
});

describe('ReviewFlow', () => {
  it('step 1: the subtitle names the session; Continue waits for a rating and 20 characters', async () => {
    const user = userEvent.setup();
    render(<ReviewFlow {...props()} />);
    expect(
      screen.getByText('SOP draft review · Sep 19. Your review helps other mentees choose.'),
    ).toBeInTheDocument();
    const cont = screen.getByRole('button', { name: 'Continue' });
    expect(cont).toBeDisabled();
    await user.click(screen.getByRole('radio', { name: '3 stars, Good' }));
    expect(screen.getByText('Add 20 more characters to continue.')).toBeInTheDocument();
    await user.type(screen.getByRole('textbox'), 'Short one.');
    expect(screen.getByText('10 / 20 characters minimum')).toBeInTheDocument();
    await user.click(screen.getByRole('textbox'));
    await user.paste(' Now it is long enough.');
    expect(cont).toBeEnabled();
  });

  it('stars: arrow keys move and choose, one tab stop', async () => {
    const user = userEvent.setup();
    render(<ReviewFlow {...props()} />);
    const group = screen.getByRole('radiogroup', {
      name: 'How would you rate your time with Gbenga?',
    });
    const first = within(group).getByRole('radio', { name: '1 star, Poor' });
    expect(first).toHaveAttribute('tabindex', '0');
    first.focus();
    await user.keyboard('{ArrowRight}{ArrowRight}');
    expect(within(group).getByRole('radio', { name: '3 stars, Good' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect(within(group).getByRole('radio', { name: '3 stars, Good' })).toHaveFocus();
  });

  it('several sessions: a "Which session?" choice, defaulting to the newest', () => {
    render(
      <ReviewFlow
        {...props({
          // Out of order on purpose: the rows put the newest first either way.
          sessions: [
            { id: 's2', startsAt: '2026-09-10T15:00:00Z', typeName: 'CV review' },
            { id: 's1', startsAt: '2026-09-19T15:00:00Z', typeName: 'SOP draft review' },
          ],
        })}
      />,
    );
    const group = screen.getByRole('radiogroup', { name: 'Which session is this about?' });
    const rows = within(group).getAllByRole('radio');
    expect(rows.map((r) => r.textContent)).toEqual(['SOP draft reviewSep 19', 'CV reviewSep 10']);
    expect(rows[0]).toHaveAttribute('aria-checked', 'true');
  });

  it('edit: opens filled in; step 2 answers the API didn’t return may stay empty', async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    render(
      <ReviewFlow
        {...props({
          mode: 'edit',
          onSend,
          initial: { overall: 4, text: 'Practical, direct feedback on my SOP draft.' },
          editableUntil: '2026-09-29T12:05:00Z',
        })}
      />,
    );
    expect(screen.getByRole('dialog', { name: 'Edit your review' })).toBeInTheDocument();
    expect(screen.getByText('You can edit this until 12:05 pm.')).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: '5 stars, Excellent' }));
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(onSend).toHaveBeenCalledTimes(1);
    expect(onSend.mock.calls[0]![0]).toMatchObject({ overall: 5 });
    expect(onSend.mock.calls[0]![1]).toBeNull();
  });

  it('a failed send says so and can be retried (the guard clears)', async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    const initial = {
      overall: 4,
      text: 'Practical, direct feedback on my SOP draft.',
      communication: 'great' as const,
      knowledge: 'great' as const,
      support: 'okay' as const,
      practicality: 'great' as const,
      value: 4,
      recommend: 9,
    };
    const { rerender } = render(<ReviewFlow {...props({ mode: 'edit', onSend, initial })} />);
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    rerender(
      <ReviewFlow
        {...props({
          mode: 'edit',
          onSend,
          initial,
          error: 'The edit window has closed, so your review stands as written.',
        })}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('The edit window has closed');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(onSend).toHaveBeenCalledTimes(2);
  });

  it('done: the preview, the edit deadline, "Book again" and "Done"', () => {
    render(
      <ReviewFlow
        {...props({
          done: true,
          editableUntil: '2026-09-29T12:05:00Z',
          initial: { overall: 5, text: 'We rewrote my SOP opening together.' },
          onBookAgain: vi.fn(),
        })}
      />,
    );
    expect(screen.getByRole('dialog', { name: 'Your review is live' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Rated 5 out of 5' })).toBeInTheDocument();
    expect(screen.getByText('You can edit it until 12:05 pm.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Book again' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument();
  });

  it('three steps: rows then "Last step."; each blocks until answered', async () => {
    const user = userEvent.setup();
    render(<ReviewFlow {...props()} />);
    await user.click(screen.getByRole('radio', { name: '4 stars, Great' }));
    await user.click(screen.getByRole('textbox'));
    await user.paste('Clear, honest advice on my shortlist.');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByText('Step 2 of 3')).toBeInTheDocument();
    expect(screen.getByText('How did Gbenga do? It only takes a few taps.')).toBeInTheDocument();
    expect(screen.getByText('Answer all 4 questions to continue.')).toBeInTheDocument();
    expect(screen.getByText('communicate')).toHaveClass(/questionKey/);
    for (const g of screen.getAllByRole('radiogroup')) {
      await user.click(within(g).getByRole('radio', { name: 'Okay' }));
    }
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByText('Last step.')).toBeInTheDocument();
    expect(screen.getByText('Answer both questions to submit.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit review' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByText('Step 2 of 3')).toBeInTheDocument();
  });

  it('screen readers hear the visible question, and what the ends of a scale mean', async () => {
    const user = userEvent.setup();
    render(<ReviewFlow {...props()} />);
    expect(
      screen.getByRole('radiogroup', { name: 'How would you rate your time with Gbenga?' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('radio', { name: '4 stars, Great' }));
    await user.click(screen.getByRole('textbox'));
    await user.paste('Clear, honest advice on my shortlist.');
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    for (const g of screen.getAllByRole('radiogroup')) {
      await user.click(within(g).getByRole('radio', { name: 'Okay' }));
    }
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    const value = screen.getByRole('radiogroup', {
      name: 'How much did this session move you toward your study abroad goals?',
    });
    expect(value).toHaveAccessibleDescription(/Not at all\s*A lot/);
  });
});
