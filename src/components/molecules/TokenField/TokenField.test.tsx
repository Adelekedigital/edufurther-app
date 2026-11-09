import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TokenField, type TokenValue } from './TokenField';

const VALUES: TokenValue[] = [
  {
    name: 'recipientName',
    meaning: 'First name of the person getting the email',
    example: 'Amara',
  },
  { name: 'mentorName', meaning: 'Mentor’s full name', example: 'Tunde Bakare' },
  { name: 'sessionDate', meaning: 'Session date' },
];

function Host({
  initial = '',
  readOnly,
  invalid,
  onBlur,
  triggers,
  maxLength,
}: {
  initial?: string;
  readOnly?: boolean;
  invalid?: boolean;
  onBlur?: () => void;
  triggers?: 'slash' | 'slashAndBrace';
  maxLength?: number;
}) {
  const [v, setV] = useState(initial);
  return (
    <>
      <label htmlFor="subject">Subject</label>
      <TokenField
        id="subject"
        value={v}
        onChange={setV}
        values={VALUES}
        readOnly={readOnly}
        invalid={invalid}
        onBlur={onBlur}
        triggers={triggers}
        maxLength={maxLength}
        menuTitle="Values this email can use"
      />
      <output data-testid="value">{v}</output>
    </>
  );
}

const field = () => screen.getByRole('textbox', { name: 'Subject' }) as HTMLTextAreaElement;
const value = () => screen.getByTestId('value').textContent;
const list = () => screen.queryByRole('listbox', { name: 'Values this email can use' });

describe('TokenField', () => {
  it('is a labelled one-line field wired as an autocomplete', () => {
    render(<Host />);
    const f = field();
    expect(f).toHaveAttribute('aria-autocomplete', 'list');
    expect(screen.getByRole('button', { name: 'Insert a value' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(f).toHaveAttribute('aria-controls', 'subject-values');
    expect(f).toHaveAttribute('placeholder', 'Type text, or / for a value');
    expect(f).toHaveAttribute('maxLength', '200');
  });

  it('/ opens the list; typing filters it by name or meaning', async () => {
    render(<Host />);
    await userEvent.type(field(), 'Hi /');
    expect(list()).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Insert a value' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(
      screen.getByText('Values this email can use · ↑↓ to move, Enter to insert'),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('option')).toHaveLength(3);
    await userEvent.type(field(), 'full');
    expect(screen.getAllByRole('option').map((o) => o.id)).toEqual(['subject-opt-mentorName']);
    expect(screen.getByText('Values matching “full”')).toBeInTheDocument();
  });

  it('Enter inserts the active value as {name} with a space before more text', async () => {
    render(<Host />);
    await userEvent.type(field(), 'Hi /ment');
    await userEvent.keyboard('{Enter}');
    expect(value()).toBe('Hi {mentorName}');
    expect(list()).toBeNull();
    expect(field()).toHaveFocus();
    expect(field().selectionStart).toBe('Hi {mentorName}'.length);
  });

  it('↑ ↓ move the active option (wrapping) and set aria-activedescendant; Tab inserts', async () => {
    render(<Host />);
    await userEvent.type(field(), '/');
    expect(field()).toHaveAttribute('aria-activedescendant', 'subject-opt-recipientName');
    await userEvent.keyboard('{ArrowDown}');
    expect(field()).toHaveAttribute('aria-activedescendant', 'subject-opt-mentorName');
    expect(screen.getByRole('option', { selected: true })).toHaveAttribute(
      'id',
      'subject-opt-mentorName',
    );
    await userEvent.keyboard('{ArrowUp}{ArrowUp}');
    expect(field()).toHaveAttribute('aria-activedescendant', 'subject-opt-sessionDate');
    await userEvent.keyboard('{Tab}');
    expect(value()).toBe('{sessionDate}');
    expect(field()).toHaveFocus();
  });

  it('{ opens the list too, but not in slash mode', async () => {
    const { unmount } = render(<Host />);
    await userEvent.type(field(), '{{');
    expect(list()).toBeInTheDocument();
    unmount();
    render(<Host triggers="slash" />);
    await userEvent.type(field(), '{{');
    expect(list()).toBeNull();
  });

  it('Esc closes the list and keeps the text', async () => {
    render(<Host />);
    await userEvent.type(field(), 'Hi /me');
    await userEvent.keyboard('{Escape}');
    expect(list()).toBeNull();
    expect(value()).toBe('Hi /me');
  });

  it('no match says so and counts the values', async () => {
    render(<Host />);
    await userEvent.type(field(), '/zzz');
    expect(screen.queryAllByRole('option')).toHaveLength(0);
    expect(
      screen.getByText('No values match “zzz”. You can use 3 values here.'),
    ).toBeInTheDocument();
    expect(field()).not.toHaveAttribute('aria-activedescendant');
  });

  it('a click on an option inserts it and keeps focus in the field', async () => {
    render(<Host />);
    await userEvent.type(field(), 'Hi /');
    await userEvent.click(screen.getByRole('option', { name: /sessionDate/ }));
    expect(value()).toBe('Hi {sessionDate}');
    expect(field()).toHaveFocus();
  });

  it('the { } button opens the list at the caret without moving focus', async () => {
    render(<Host initial="Hello there" />);
    const f = field();
    await userEvent.click(f);
    f.setSelectionRange(5, 5);
    fireEvent.select(f);
    await userEvent.click(screen.getByRole('button', { name: 'Insert a value' }));
    expect(f).toHaveFocus();
    expect(list()).toBeInTheDocument();
    await userEvent.keyboard('{Enter}');
    expect(value()).toBe('Hello {recipientName} there');
  });

  it('Enter with the list closed adds no line', async () => {
    render(<Host initial="Hi" />);
    await userEvent.type(field(), '{Enter}');
    expect(value()).toBe('Hi');
  });

  it('a pasted line break becomes a space', async () => {
    render(<Host />);
    await userEvent.click(field());
    await userEvent.paste('one\ntwo');
    expect(value()).toBe('one two');
  });

  it('Backspace after a value removes all of it', async () => {
    render(<Host initial="Hi {mentorName}" />);
    const f = field();
    await userEvent.click(f);
    f.setSelectionRange(15, 15);
    await userEvent.keyboard('{Backspace}');
    expect(value()).toBe('Hi ');
  });

  it('Delete before a value removes all of it', async () => {
    render(<Host initial="{mentorName} hi" />);
    const f = field();
    await userEvent.click(f);
    f.setSelectionRange(0, 0);
    await userEvent.keyboard('{Delete}');
    expect(value()).toBe(' hi');
  });

  it('← and → step over a value', async () => {
    render(<Host initial="a{mentorName}b" />);
    const f = field();
    await userEvent.click(f);
    f.setSelectionRange(13, 13);
    await userEvent.keyboard('{ArrowLeft}');
    expect(f.selectionStart).toBe(1);
    await userEvent.keyboard('{ArrowRight}');
    expect(f.selectionStart).toBe(13);
  });

  it('draws known values as chips and anything else as a bad chip', () => {
    const { container } = render(<Host initial="Hi {mentorName} {mentorname}" />);
    const mirror = container.querySelector('[aria-hidden="true"]')!;
    const chips = [...mirror.querySelectorAll('span')].filter((s) =>
      s.textContent?.startsWith('{'),
    );
    expect(chips.map((c) => c.textContent)).toEqual(['{mentorName}', '{mentorname}']);
    expect(chips[0]!.className).toMatch(/chip/);
    expect(chips[0]!.className).not.toMatch(/bad/);
    expect(chips[1]!.className).toMatch(/bad/);
  });

  it('invalid marks the field for assistive tech', () => {
    render(<Host invalid />);
    expect(field()).toHaveAttribute('aria-invalid', 'true');
  });

  it('read only: no typing, no list, the button is disabled', async () => {
    render(<Host initial="Fixed" readOnly />);
    await userEvent.type(field(), ' /');
    expect(value()).toBe('Fixed');
    expect(list()).toBeNull();
    expect(screen.getByRole('button', { name: 'Insert a value' })).toBeDisabled();
  });

  it('an insert that would pass the hard max is refused', async () => {
    render(<Host initial="1234567" maxLength={10} />);
    await userEvent.type(field(), ' /');
    await userEvent.keyboard('{Enter}');
    expect(value()).toBe('1234567 /');
  });

  it('with no match, Tab leaves the field: blur closes the list and calls onBlur', async () => {
    const onBlur = vi.fn();
    render(<Host onBlur={onBlur} />);
    await userEvent.type(field(), '/zzz');
    await userEvent.tab();
    expect(onBlur).toHaveBeenCalled();
    expect(list()).toBeNull();
  });
});
