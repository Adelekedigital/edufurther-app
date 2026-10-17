import { useState } from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AiField, type AssistMode } from './AiField';

function Harness({
  initial = '',
  drafted = false,
  onAssist,
  draftNote,
}: {
  initial?: string;
  drafted?: boolean;
  onAssist?: (mode: AssistMode, text: string) => Promise<string>;
  draftNote?: string;
}) {
  const [text, setText] = useState(initial);
  const [isDraft, setIsDraft] = useState(drafted);
  return (
    <>
      <AiField
        label="About"
        value={text}
        drafted={isDraft}
        onChange={(t, m) => {
          setText(t);
          setIsDraft(m.drafted);
        }}
        max={40}
        hint="Lead with the path you’ve walked."
        onAssist={onAssist}
        draftNote={draftNote}
      />
      <output data-testid="drafted">{String(isDraft)}</output>
    </>
  );
}

const box = () => screen.getByRole('textbox', { name: 'About' });

describe('AiField', () => {
  it('offers "Write a draft" on an empty box, then shows the draft as drafted', async () => {
    const user = userEvent.setup();
    const onAssist = vi.fn().mockResolvedValue('A draft.');
    render(<Harness onAssist={onAssist} draftNote="We drafted this." />);
    await user.click(screen.getByRole('button', { name: 'Write a draft' }));
    expect(onAssist).toHaveBeenCalledWith('draft', '');
    expect(box()).toHaveValue('A draft.');
    expect(screen.getByText('Drafted for you')).toBeInTheDocument();
    expect(screen.getByText('We drafted this.')).toBeInTheDocument();
    // An untouched draft offers no action.
    expect(screen.queryByRole('button', { name: /Write a draft|Improve/ })).toBeNull();
    expect(screen.getByTestId('drafted')).toHaveTextContent('true');
  });

  it('editing any word clears the draft and brings "Improve" back', async () => {
    const user = userEvent.setup();
    render(<Harness initial="A draft." drafted onAssist={vi.fn()} />);
    expect(screen.getByText('Drafted for you')).toBeInTheDocument();
    await user.type(box(), ' Mine');
    expect(screen.queryByText('Drafted for you')).toBeNull();
    expect(screen.getByRole('button', { name: 'Improve' })).toBeInTheDocument();
    expect(screen.getByTestId('drafted')).toHaveTextContent('false');
  });

  it('is read-only while working, and Undo restores the text from before', async () => {
    const user = userEvent.setup();
    let resolve!: (t: string) => void;
    const onAssist = vi.fn(() => new Promise<string>((r) => (resolve = r)));
    render(<Harness initial="my text" onAssist={onAssist} />);
    await user.click(screen.getByRole('button', { name: 'Improve' }));
    expect(onAssist).toHaveBeenCalledWith('improve', 'my text');
    expect(box()).toHaveAttribute('readonly');
    expect(screen.getByRole('button', { name: 'Improving…' })).toHaveAttribute('aria-busy', 'true');
    await act(async () => resolve('My text.'));
    expect(box()).toHaveValue('My text.');
    expect(box()).not.toHaveAttribute('readonly');
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    expect(box()).toHaveValue('my text');
    expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull();
  });

  it('says what went wrong in the status line and leaves the text alone', async () => {
    const user = userEvent.setup();
    const onAssist = vi.fn().mockRejectedValue(new Error('You’ve used today’s writing help.'));
    render(<Harness initial="keep me" onAssist={onAssist} />);
    await user.click(screen.getByRole('button', { name: 'Improve' }));
    expect(await screen.findByText('You’ve used today’s writing help.')).toHaveAttribute(
      'aria-live',
      'polite',
    );
    expect(box()).toHaveValue('keep me');
    expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull();
  });

  it('keeps an AI answer within the limit, and counts it', async () => {
    const user = userEvent.setup();
    render(<Harness onAssist={vi.fn().mockResolvedValue('x'.repeat(60))} />);
    await user.click(screen.getByRole('button', { name: 'Write a draft' }));
    expect(box()).toHaveValue('x'.repeat(40));
    expect(screen.getByText('40/40')).toBeInTheDocument();
    expect(box()).toHaveAccessibleDescription(expect.stringContaining('Lead with the path'));
  });

  it('is a plain field with no assist', () => {
    render(<Harness initial="text" />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('puts focus back on the text after a draft and after Undo, and says what happened', async () => {
    const user = userEvent.setup();
    render(<Harness onAssist={vi.fn().mockResolvedValue('A draft.')} />);
    await user.click(screen.getByRole('button', { name: 'Write a draft' }));
    await vi.waitFor(() => expect(box()).toHaveFocus());
    expect(screen.getByText('Draft added. Undo to go back.')).toHaveClass('sr-only');
    await user.click(screen.getByRole('button', { name: 'Undo' }));
    await vi.waitFor(() => expect(box()).toHaveFocus());
    expect(box()).toHaveValue('');
  });

  it('leaves their words as theirs when Improve changes nothing', async () => {
    const user = userEvent.setup();
    render(<Harness initial="Tidy." onAssist={vi.fn().mockResolvedValue('Tidy.')} />);
    await user.click(screen.getByRole('button', { name: 'Improve' }));
    expect(await screen.findByText('No changes to suggest.')).toBeInTheDocument();
    expect(screen.queryByText('Drafted for you')).toBeNull();
    expect(screen.getByTestId('drafted')).toHaveTextContent('false');
  });

  it('tells assistive tech the text is still an AI draft', () => {
    render(<Harness initial="A draft." drafted onAssist={vi.fn()} />);
    expect(box()).toHaveAccessibleDescription(expect.stringContaining('Drafted for you'));
  });

  it('forgets the old draft and Undo when the parent replaces the text', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <AiField label="About" value="A draft." drafted onChange={onChange} max={40} />,
    );
    expect(screen.getByText('Drafted for you')).toBeInTheDocument();
    rerender(<AiField label="About" value="Someone else’s." onChange={onChange} max={40} />);
    expect(screen.queryByText('Drafted for you')).toBeNull();
  });

  it('ends Undo once they edit by hand, so it never throws away their typing', async () => {
    const user = userEvent.setup();
    render(<Harness initial="my text" onAssist={vi.fn().mockResolvedValue('My text.')} />);
    await user.click(screen.getByRole('button', { name: 'Improve' }));
    expect(await screen.findByRole('button', { name: 'Undo' })).toBeInTheDocument();
    await user.type(box(), ' More');
    expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull();
    expect(box()).toHaveValue('My text. More');
  });
});
