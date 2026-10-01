import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { blankDraft } from '@/lib/utils/sessionTypeDraft';
import { IntakeQuestionsStep } from './IntakeQuestionsStep';

const renderStep = () => {
  const update = vi.fn();
  render(
    <IntakeQuestionsStep
      draft={blankDraft()}
      update={update}
      errors={{}}
      onDeleteQuestion={vi.fn()}
    />,
  );
  return update;
};

describe('IntakeQuestionsStep editor', () => {
  it('Enter on a choice question moves to its options; Enter there saves', async () => {
    const user = userEvent.setup();
    const update = renderStep();
    await user.click(screen.getByRole('radio', { name: /Single choice/ }));
    await user.type(screen.getByRole('textbox', { name: 'Question' }), 'Which intake?{Enter}');
    expect(update).not.toHaveBeenCalled();
    expect(screen.getByRole('textbox', { name: 'Answer options' })).toHaveFocus();
    await user.keyboard('Fall, Spring{Enter}');
    expect(update).toHaveBeenCalledWith({
      questions: [expect.objectContaining({ text: 'Which intake?', options: ['Fall', 'Spring'] })],
    });
  });

  it('an options error shows on the options, a missing question on the question', async () => {
    const user = userEvent.setup();
    renderStep();
    await user.click(screen.getByRole('radio', { name: /Single choice/ }));
    const question = screen.getByRole('textbox', { name: 'Question' });
    const options = screen.getByRole('textbox', { name: 'Answer options' });
    await user.type(question, 'Which intake?');
    await user.type(options, 'Fall{Enter}');
    expect(options).toHaveAccessibleDescription('Add at least two options.');
    expect(options).toHaveAttribute('aria-invalid', 'true');
    expect(question).not.toHaveAttribute('aria-invalid', 'true');
    await user.clear(question);
    await user.click(screen.getByRole('button', { name: 'Add question' }));
    expect(question).toHaveAccessibleDescription('Write the question.');
  });

  it('Enter on a short-answer question saves it', async () => {
    const user = userEvent.setup();
    const update = renderStep();
    await user.type(screen.getByRole('textbox', { name: 'Question' }), 'Your goal?{Enter}');
    expect(update).toHaveBeenCalledOnce();
  });

  it('a choice question asks the question first, then its options (product, 2026-09-30)', async () => {
    const user = userEvent.setup();
    render(
      <IntakeQuestionsStep
        draft={blankDraft()}
        update={vi.fn()}
        errors={{}}
        onDeleteQuestion={vi.fn()}
      />,
    );
    await user.click(screen.getByRole('radio', { name: /Single choice/ }));
    const question = screen.getByRole('textbox', { name: 'Question' });
    const options = screen.getByRole('textbox', { name: 'Answer options' });
    // DOM order is reading and Tab order.
    expect(
      question.compareDocumentPosition(options) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});
