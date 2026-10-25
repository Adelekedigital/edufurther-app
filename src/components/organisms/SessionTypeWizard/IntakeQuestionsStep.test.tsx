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
    // Said through the always-mounted live region, not a freshly mounted alert.
    expect(screen.getAllByRole('status').map((el) => el.textContent)).toContain(
      'Add at least two options.',
    );
    expect(screen.queryByRole('alert')).toBeNull();
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
    // The order a keyboard user meets them.
    question.focus();
    await user.tab();
    expect(options).toHaveFocus();
  });
});

describe('IntakeQuestionsStep: the help-area question (backend PR 540)', () => {
  const synced = {
    key: 'q2',
    id: 'q2',
    text: 'Which area do you need help with most?',
    kind: 'single' as const,
    required: true,
    options: ['Document preparation', 'School selection'],
    synced: true,
  };
  const renderSynced = () => {
    const update = vi.fn();
    render(
      <IntakeQuestionsStep
        draft={{ ...blankDraft(), questions: [synced] }}
        update={update}
        errors={{}}
        onDeleteQuestion={vi.fn()}
      />,
    );
    return update;
  };

  it('the list says where its options come from, and that they follow Settings', () => {
    renderSynced();
    expect(
      screen.getByText('Single choice · Options come from your areas of expertise · Required'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Document preparation, School selection\. These update when you change your topics in/,
      ),
    ).toBeInTheDocument();
    const link = screen.getAllByRole('link', { name: 'Settings (opens in a new tab)' })[0]!;
    expect(link).toHaveAttribute('href', '/settings/expertise');
  });

  it('its editor has no type or options to change, says why, and saves its words and required only', async () => {
    const user = userEvent.setup();
    const update = renderSynced();
    await user.click(screen.getByRole('button', { name: /Edit/ }));
    expect(screen.queryByRole('radiogroup', { name: 'Answer type' })).toBeNull();
    expect(screen.queryByRole('textbox', { name: 'Answer options' })).toBeNull();
    expect(
      screen.getByText(
        /Options come from your areas of expertise: Document preparation, School selection\. Change them in/,
      ),
    ).toBeInTheDocument();
    const question = screen.getByRole('textbox', { name: 'Question' });
    await user.clear(question);
    await user.type(question, 'Where do you need help most?');
    await user.click(screen.getByRole('switch', { name: 'Required' }));
    await user.click(screen.getByRole('button', { name: /Save question/ }));
    expect(update).toHaveBeenCalledWith({
      questions: [
        {
          ...synced,
          text: 'Where do you need help most?',
          required: false,
        },
      ],
    });
  });
});
