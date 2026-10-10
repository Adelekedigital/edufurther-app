import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { BookingAnswer } from '@/types/booking';
import { AnswerItem } from './AnswerItem';

const base: BookingAnswer = {
  questionId: 'q1',
  question: 'What do you want to cover?',
  kind: 'free_text',
  retired: false,
  answered: true,
  required: null,
  text: 'My statement of purpose.',
  file: null,
};
const PDF = {
  id: 'f1',
  filename: 'SOP-draft-v2.pdf',
  contentType: 'application/pdf' as const,
  size: 182_400,
  available: true,
};

describe('AnswerItem', () => {
  it('shows the question and what was answered', () => {
    render(<AnswerItem answer={base} />);
    expect(screen.getByText('What do you want to cover?')).toBeVisible();
    expect(screen.getByText('My statement of purpose.')).toBeVisible();
  });

  it('marks a question the mentor has since dropped, and keeps its answer', () => {
    render(<AnswerItem answer={{ ...base, retired: true }} />);
    // PROVISIONAL copy — the design has no state for this.
    expect(screen.getByText(/\(no longer asked\)/)).toBeVisible();
    expect(screen.getByText('My statement of purpose.')).toBeVisible();
  });

  it('a file answer opens the viewer, and says which file it is', async () => {
    const onOpenFile = vi.fn();
    render(
      <AnswerItem answer={{ ...base, kind: 'file_upload', file: PDF }} onOpenFile={onOpenFile} />,
    );
    const button = screen.getByRole('button', { name: 'Open SOP-draft-v2.pdf' });
    expect(button).toHaveTextContent('178 KB');
    await userEvent.click(button);
    expect(onOpenFile).toHaveBeenCalledWith(PDF);
  });

  it('a file retention has removed says so, and offers nothing to click', () => {
    render(
      <AnswerItem
        answer={{ ...base, kind: 'file_upload', file: { ...PDF, available: false } }}
        onOpenFile={vi.fn()}
      />,
    );
    expect(screen.getByText(/no longer available/)).toBeVisible();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('a file with no way to open it is named, not reported as deleted', () => {
    // The bug this guards: one forgotten prop told every mentee their upload
    // had been removed by retention.
    render(<AnswerItem answer={{ ...base, kind: 'file_upload', file: PDF }} />);
    expect(screen.getByText('SOP-draft-v2.pdf')).toBeVisible();
    expect(screen.queryByText(/no longer available/)).not.toBeInTheDocument();
  });

  it('the filename is isolated, so a bidi override cannot reorder the words beside it', () => {
    render(<AnswerItem answer={{ ...base, kind: 'file_upload', file: PDF }} />);
    expect(screen.getByText('SOP-draft-v2.pdf')).toHaveAttribute('dir', 'ltr');
  });
});

// Blank answers: backend #412.
describe('a question that was asked and left blank', () => {
  const blank = (over = {}) => ({ ...base, answered: false, text: '', ...over });

  it('says No answer rather than showing an empty line', () => {
    render(<AnswerItem answer={blank({ question: 'Anything else?' })} />);
    expect(screen.getByText('Anything else?')).toBeVisible();
    expect(screen.getByText('No answer')).toBeVisible();
  });

  it('never claims a file was removed when none was uploaded', () => {
    // A blank file question has no file. Routed down the file branch it would
    // read "— no longer available", telling a mentee their upload was deleted
    // when they never made one.
    render(
      <AnswerItem
        answer={blank({ question: 'Your CV', kind: 'file_upload' })}
        onOpenFile={() => {}}
      />,
    );
    expect(screen.getByText('No answer')).toBeVisible();
    expect(screen.queryByText(/no longer available/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('still marks a dropped question as no longer asked', () => {
    render(<AnswerItem answer={blank({ question: 'Old one', retired: true })} />);
    expect(screen.getByText(/Old one \(no longer asked\)/)).toBeVisible();
    expect(screen.getByText('No answer')).toBeVisible();
  });

  it('is told apart by more than colour', () => {
    // Grey alone disappears in forced-colours and greyscale, so the blank row
    // carries a second signal.
    const { container } = render(<AnswerItem answer={blank()} />);
    const el = container.querySelector('p')!;
    expect(el.className).toContain('blank');
  });
});
