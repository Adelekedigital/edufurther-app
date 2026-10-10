import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { BookingAnswer } from '@/types/booking';
import { SessionPrep } from './SessionPrep';

const base = {
  answersTitle: 'What Amara wants to talk about',
  guide: [{ title: 'If plans change', body: 'Cancel in good time.' }],
};

const q = (i: number, over: Partial<BookingAnswer> = {}): BookingAnswer => ({
  questionId: `q${i}`,
  question: `Question ${i}?`,
  kind: 'free_text',
  retired: false,
  answered: false,
  required: null,
  text: '',
  file: null,
  ...over,
});

describe('a form where every question was left blank (backend #412)', () => {
  it('offers no answers row at all, rather than one that opens on nothing', () => {
    // Since #412 the list carries every question asked. Counted by rows, this
    // showed "What Amara wants to talk about" and opened on two "No answer"s.
    render(<SessionPrep {...base} answers={[q(1), q(2)]} />);
    expect(screen.queryByRole('button', { name: /talk about/i })).not.toBeInTheDocument();
  });

  it('keeps the row when at least one question was answered', () => {
    render(
      <SessionPrep {...base} answers={[q(1), q(2, { answered: true, text: 'Funding, mostly.' })]} />,
    );
    expect(screen.getByRole('button', { name: /talk about/i })).toBeVisible();
  });

  it('the one-line summary skips blanks instead of joining their empty text', () => {
    // Joining every row gave " · Funding, mostly." — a leading separator, and
    // doubled ones between consecutive blanks.
    render(
      <SessionPrep {...base} answers={[q(1), q(2, { answered: true, text: 'Funding, mostly.' })]} />,
    );
    // Scoped to the answers summary: the guide row's own preview reads
    // "1 tips · 1 min read", so a document-wide check for the separator would
    // always fail.
    const summary = screen
      .getAllByText(/Funding, mostly\./)
      .map((el) => el.textContent ?? '')
      .find((t) => t.includes('Funding'))!;
    expect(summary).toBe('Funding, mostly.');
  });

  it('a failed read still gets its row, so the answers do not just vanish', () => {
    render(<SessionPrep {...base} answers={null} answersFailed />);
    expect(screen.getByText('Couldn’t load the answers.')).toBeVisible();
  });
});
