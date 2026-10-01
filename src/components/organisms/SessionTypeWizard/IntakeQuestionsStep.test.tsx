import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { blankDraft } from '@/lib/utils/sessionTypeDraft';
import { IntakeQuestionsStep } from './IntakeQuestionsStep';

describe('IntakeQuestionsStep editor', () => {
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
