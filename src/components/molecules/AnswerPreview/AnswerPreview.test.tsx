import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AnswerPreview } from './AnswerPreview';

const preview = (count: number) => ({
  count,
  first: { question: 'What do you want to cover?', text: 'Nine programs, cut to five.' },
});

describe('AnswerPreview', () => {
  it('labels the answer with the question that was actually asked', () => {
    render(<AnswerPreview preview={preview(3)} onOpenAll={vi.fn()} controls="p" />);
    // Not a fixed "What X wants to cover": the first question is whatever the
    // mentor put first, and a generic label misattributes the answer.
    expect(screen.getByText('What do you want to cover?')).toBeVisible();
    expect(screen.getByText('Nine programs, cut to five.')).toBeVisible();
  });

  it('offers the rest by count, and says what it opens', async () => {
    const onOpenAll = vi.fn();
    render(<AnswerPreview preview={preview(6)} onOpenAll={onOpenAll} controls="booking-details" />);
    const button = screen.getByRole('button', { name: 'See all 6 answers' });
    expect(button).toHaveAttribute('aria-controls', 'booking-details');
    await userEvent.click(button);
    expect(onOpenAll).toHaveBeenCalledTimes(1);
  });

  it('a single answer is shown, with nothing more to open', () => {
    render(<AnswerPreview preview={preview(1)} onOpenAll={vi.fn()} controls="p" />);
    expect(screen.getByText('Nine programs, cut to five.')).toBeVisible();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('the button does not also fire the row it sits in', async () => {
    const rowClick = vi.fn();
    render(
      <div onClick={rowClick}>
        <AnswerPreview preview={preview(4)} onOpenAll={vi.fn()} controls="p" />
      </div>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'See all 4 answers' }));
    // Without stopPropagation the row's own handler runs too and the panel
    // opens collapsed a moment later.
    expect(rowClick).not.toHaveBeenCalled();
  });

  it('on the hero it is the link alone — that card has no box', () => {
    render(<AnswerPreview preview={preview(4)} onOpenAll={vi.fn()} controls="p" linkOnly />);
    expect(screen.getByRole('button', { name: 'See all 4 answers' })).toBeVisible();
    expect(screen.queryByText('What do you want to cover?')).not.toBeInTheDocument();
  });

  it('on the hero a single answer still gets a way in — the hero shows none', () => {
    render(<AnswerPreview preview={preview(1)} onOpenAll={vi.fn()} controls="p" linkOnly />);
    // The row shows the first answer, so with only one there is nothing more
    // to open. The hero shows nothing, so hiding the link hid the whole form.
    expect(screen.getByRole('button', { name: 'See the answer' })).toBeVisible();
  });

  it('a single answer is never "all 1 answers"', () => {
    render(<AnswerPreview preview={preview(1)} onOpenAll={vi.fn()} controls="p" linkOnly />);
    expect(screen.getByRole('button').textContent).toBe('See the answer');
  });
});

describe('telling one row\u2019s button from another\u2019s', () => {
  it('names the booking, so a screen reader can tell them apart', () => {
    render(
      <AnswerPreview
        preview={preview(4)}
        onOpenAll={vi.fn()}
        controls="p"
        forBooking="Visa practice session with Amara Okafor"
      />,
    );
    // Without this every row offers an identical "See all 4 answers"; the ⋯
    // beside it already names the booking for the same reason.
    expect(
      screen.getByRole('button', {
        name: 'See all 4 answers for Visa practice session with Amara Okafor',
      }),
    ).toBeVisible();
  });

  it('the booking name is for screen readers, not the visible label', () => {
    render(
      <AnswerPreview preview={preview(4)} onOpenAll={vi.fn()} controls="p" forBooking="Visa practice" />,
    );
    expect(screen.getByRole('button').textContent).toBe('See all 4 answers');
  });

  it('with no booking given it falls back to the visible label', () => {
    render(<AnswerPreview preview={preview(4)} onOpenAll={vi.fn()} controls="p" />);
    expect(screen.getByRole('button', { name: 'See all 4 answers' })).toBeVisible();
  });
});
