import { describe, expect, it } from 'vitest';
import type { BookingAnswer } from '@/types/booking';
import { hasAnswersToShow } from './SessionPrep';

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

// Blank answers: backend #412.
describe('hasAnswersToShow counts answers, not questions', () => {
  it('a form where every question was left blank has nothing to show', () => {
    // The list carries every question asked since #412, so a row count said
    // "there are answers" and the card opened on two "No answer" lines.
    expect(hasAnswersToShow({ answers: [q(1), q(2)] })).toBe(false);
  });

  it('one answer among blanks is enough', () => {
    expect(hasAnswersToShow({ answers: [q(1), q(2, { answered: true, text: 'Funding.' })] })).toBe(
      true,
    );
  });

  it('a failed read still has something to show, so the answers do not vanish', () => {
    expect(hasAnswersToShow({ answers: null, answersFailed: true })).toBe(true);
  });

  it('still loading holds the place', () => {
    expect(hasAnswersToShow({ answers: null, answersLoading: true })).toBe(true);
  });

  it('no form at all shows nothing', () => {
    expect(hasAnswersToShow({ answers: [] })).toBe(false);
    expect(hasAnswersToShow({ answers: null })).toBe(false);
  });
});
