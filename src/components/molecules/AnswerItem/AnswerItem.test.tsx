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
