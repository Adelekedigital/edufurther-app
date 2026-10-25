import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { BookingAnswer } from '@/types/booking';
import { hasAnswersToShow, SessionPrepAside, SessionPrepButtons } from './SessionPrep';

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

describe('the copy pass (PRD Session Join, Getting ready)', () => {
  it('the aside’s guide is titled "Quick guide"', () => {
    render(
      <SessionPrepAside
        answersTitle="What Amara wants to talk about"
        answersSub="From Amara’s booking answers."
        answers={[]}
        guide={[{ icon: 'wifi', title: 'Your setup', body: 'A quiet spot.' }]}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Quick guide' })).toBeVisible();
  });

  it('the phone buttons read the answers label given and "Quick guide"', () => {
    render(<SessionPrepButtons answersLabel="Amara’s response" showAnswers onOpen={() => {}} />);
    expect(screen.getByRole('button', { name: 'Amara’s response' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Quick guide' })).toBeVisible();
  });
});
