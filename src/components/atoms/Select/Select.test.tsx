import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState, type ComponentProps } from 'react';
import { Select, type SelectOption } from './Select';
import { typeaheadIndex } from './typeahead';
import { LIST_MAX, outOfView, placeList } from './useListPosition';

const lengths: SelectOption[] = [
  { value: '30', label: '30 min' },
  { value: '45', label: '45 min' },
  { value: '60', label: '60 min' },
  { value: '90', label: '90 min' },
];
const degrees: SelectOption[] = [
  { value: 'ba', label: 'BA' },
  { value: 'bsc', label: 'BSc' },
  { value: 'ma', label: 'MA' },
  { value: 'mba', label: 'MBA' },
  { value: 'msc', label: 'MSc' },
  { value: 'phd', label: 'PhD' },
];

type Props = Partial<ComponentProps<typeof Select>>;

function Plain({
  start = '60',
  options = lengths,
  onPick = vi.fn(),
  ...p
}: Props & {
  start?: string;
  onPick?: (v: string) => void;
}) {
  const [v, setV] = useState(start);
  return (
    <>
      <label htmlFor="len">Session length</label>
      <Select
        id="len"
        {...p}
        options={options}
        value={v}
        onChange={(e) => {
          setV(e.target.value);
          onPick(e.target.value);
        }}
      />
      <button type="button">After</button>
    </>
  );
}

const field = () => screen.getByRole('combobox', { name: 'Session length' });
const listbox = () => screen.getByRole('listbox');
const activeLabel = () => {
  const id = field().getAttribute('aria-activedescendant');
  // The check icon is a ligature: its text is not part of the row's name.
  return id ? document.getElementById(id)?.textContent?.replace('check_circle', '') : null;
};

describe('Select (select-only)', () => {
  it('shows the chosen label and value, closed, with no list in the page', () => {
    render(<Plain />);
    expect(field()).toHaveTextContent('60 min');
    expect(field()).toHaveValue('60');
    expect(field()).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it.each(['{Enter}', ' ', '{ArrowDown}', '{Alt>}{ArrowDown}{/Alt}', '{ArrowUp}'])(
    '%s opens on the chosen row, focus staying on the field',
    async (keys) => {
      const user = userEvent.setup();
      render(<Plain />);
      field().focus();
      await user.keyboard(keys);
      expect(field()).toHaveAttribute('aria-expanded', 'true');
      expect(field()).toHaveFocus();
      expect(activeLabel()).toBe('60 min');
      expect(listbox()).toHaveAccessibleName('Session length');
    },
  );

  it('Up and Down move, Home and End jump, Enter picks and closes', async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    render(<Plain onPick={onPick} />);
    field().focus();
    await user.keyboard('{Enter}{ArrowDown}');
    expect(activeLabel()).toBe('90 min');
    await user.keyboard('{ArrowDown}');
    expect(activeLabel()).toBe('90 min');
    await user.keyboard('{Home}');
    expect(activeLabel()).toBe('30 min');
    await user.keyboard('{ArrowUp}');
    expect(activeLabel()).toBe('30 min');
    await user.keyboard('{End}{ArrowUp}{ArrowUp}{Enter}');
    expect(onPick).toHaveBeenCalledWith('45');
    await user.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}{Enter}');
    expect(onPick).toHaveBeenLastCalledWith('90');
    expect(field()).toHaveValue('90');
    expect(field()).toHaveAttribute('aria-expanded', 'false');
  });

  it('Escape closes without a change; Tab closes and moves on', async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    render(<Plain onPick={onPick} />);
    field().focus();
    await user.keyboard('{Enter}{ArrowDown}{Escape}');
    expect(field()).toHaveAttribute('aria-expanded', 'false');
    expect(field()).toHaveValue('60');
    await user.keyboard('{Enter}{ArrowDown}');
    await user.tab();
    expect(screen.getByRole('button', { name: 'After' })).toHaveFocus();
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(onPick).not.toHaveBeenCalled();
  });

  it('the chosen row carries the check; the active row is aria-selected', async () => {
    const user = userEvent.setup();
    render(<Plain />);
    await user.click(field());
    const rows = screen.getAllByRole('option');
    expect(rows.map((r) => r.getAttribute('aria-selected'))).toEqual([
      'false',
      'false',
      'true',
      'false',
    ]);
    expect(rows[2]!.textContent).toContain('check_circle');
    expect(rows[0]!.textContent).not.toContain('check_circle');
  });

  it('read-only: focusable and in the tab order, but it never opens', async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    render(<Plain readOnly onPick={onPick} />);
    expect(field()).toHaveAttribute('aria-readonly', 'true');
    expect(field()).not.toBeDisabled();
    await user.tab();
    expect(field()).toHaveFocus();
    await user.keyboard('{Enter}{ArrowDown} m');
    await user.click(field());
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(field()).toHaveAttribute('aria-expanded', 'false');
    expect(field()).toHaveFocus();
    expect(onPick).not.toHaveBeenCalled();
  });

  it('density md is the medium button height', () => {
    render(<Plain density="md" />);
    expect(field().parentElement).toHaveClass('md');
    // jsdom applies no CSS: the rule itself must use the 40px button token.
    const css = readFileSync(join(__dirname, 'Select.module.css'), 'utf8');
    expect(css).toMatch(/\.md \.control \{\s*height: var\(--button-h-medium\);/);
  });

  it('a real option whose value is empty ("No year") carries the check when chosen', async () => {
    const user = userEvent.setup();
    const years: SelectOption[] = [
      { value: '2024', label: '2024' },
      { value: '2023', label: '2023' },
      { value: '', label: 'No year' },
    ];
    render(<Plain options={years} start="" />);
    expect(field()).toHaveTextContent('No year');
    await user.click(field());
    const rows = screen.getAllByRole('option');
    expect(rows[2]!.textContent).toContain('check_circle');
    expect(rows[0]!.textContent).not.toContain('check_circle');
  });

  it('nothing chosen and no empty option: no row is checked', async () => {
    const user = userEvent.setup();
    render(<Plain start="" />);
    await user.click(field());
    expect(screen.getAllByRole('option').some((r) => r.textContent?.includes('check_circle'))).toBe(
      false,
    );
  });

  it('a click opens, a click on a row picks, a click outside closes', async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    render(<Plain onPick={onPick} />);
    await user.click(field());
    await user.click(screen.getByRole('option', { name: '45 min' }));
    expect(onPick).toHaveBeenCalledWith('45');
    expect(field()).toHaveFocus();
    await user.click(field());
    expect(listbox()).toBeInTheDocument();
    await user.click(document.body);
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('typing a letter jumps to the next match, and again cycles', async () => {
    const user = userEvent.setup();
    render(<Plain options={degrees} start="ba" />);
    field().focus();
    await user.keyboard('m');
    expect(field()).toHaveAttribute('aria-expanded', 'true');
    expect(activeLabel()).toBe('MA');
    await user.keyboard('m');
    expect(activeLabel()).toBe('MBA');
    await user.keyboard('m');
    expect(activeLabel()).toBe('MSc');
    await user.keyboard('{Enter}');
    expect(field()).toHaveValue('msc');
  });

  it('onHighlight hears each new active row: arrows, typeahead, and null on close', async () => {
    const user = userEvent.setup();
    const onHighlight = vi.fn();
    render(<Plain options={degrees} start="ba" onHighlight={onHighlight} />);
    field().focus();
    await user.keyboard('{Enter}');
    await user.keyboard('{ArrowDown}');
    await user.keyboard('p');
    await user.keyboard('{Escape}');
    expect(onHighlight.mock.calls.map(([o]) => o?.value ?? null)).toEqual([
      'ba',
      'bsc',
      'phd',
      null,
    ]);
  });

  it('a disabled field does not open', async () => {
    const user = userEvent.setup();
    render(<Plain disabled />);
    expect(field()).toBeDisabled();
    await user.click(field());
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('marks an error and passes id, describedby and data attributes to the field', () => {
    render(<Plain invalid aria-describedby="hint" data-ff="length" />);
    expect(field()).toHaveAttribute('aria-invalid', 'true');
    expect(field()).toHaveAttribute('aria-describedby', 'hint');
    expect(field()).toHaveAttribute('data-ff', 'length');
  });
});

describe('typeaheadIndex', () => {
  const labels = ['BA', 'BSc', 'MA', 'MBA', 'MSc'];
  it('finds a prefix from the current row, cycling a repeated letter', () => {
    expect(typeaheadIndex(labels, 'm', 0)).toBe(2);
    expect(typeaheadIndex(labels, 'm', 2)).toBe(3);
    expect(typeaheadIndex(labels, 'mm', 4)).toBe(2);
    expect(typeaheadIndex(labels, 'ms', 0)).toBe(4);
    expect(typeaheadIndex(labels, 'bs', 1)).toBe(1);
    expect(typeaheadIndex(labels, 'z', 0)).toBe(-1);
  });
});

describe('placeList', () => {
  const rect = (top: number, h = 37, left = 20, w = 200) =>
    ({ top, bottom: top + h, left, width: w, right: left + w, height: h }) as DOMRect;

  it('opens below the field, at least as wide, capped at 260', () => {
    const p = placeList(rect(100), 600, 1280, 800);
    expect(p.above).toBe(false);
    expect(p.style).toMatchObject({ top: 141, left: 20, minWidth: 200, maxHeight: LIST_MAX });
  });

  it('flips above when there is no room below and more above', () => {
    const p = placeList(rect(700), 200, 1280, 800);
    expect(p.above).toBe(true);
    expect(p.style).toMatchObject({ bottom: 104 });
    expect(p.style.top).toBeUndefined();
  });

  it('stays below when a short list fits', () => {
    expect(placeList(rect(600), 120, 1280, 800).above).toBe(false);
  });

  it('keeps inside the viewport on the right', () => {
    const p = placeList(rect(100, 37, 300, 200), 100, 390, 800);
    expect(p.style.left).toBe(182);
  });

  it('with the phone keyboard up, measures the visible part (visualViewport)', () => {
    // Layout 800 tall, but only 0–400 is visible above the keyboard.
    const p = placeList(rect(300), 200, 390, 800, { top: 0, height: 400 });
    expect(p.above).toBe(true);
    expect(p.style).toMatchObject({ bottom: 504 });
    // Scrolled visual viewport: room is counted from its top.
    expect(placeList(rect(300), 200, 390, 800, { top: 250, height: 400 }).above).toBe(false);
  });
});

describe('outOfView', () => {
  const r = (top: number, bottom: number) => ({ top, bottom }) as DOMRect;
  it('is true once the field has scrolled out of its container', () => {
    expect(outOfView(r(100, 137), r(50, 400))).toBe(false);
    expect(outOfView(r(10, 47), r(50, 400))).toBe(true);
    expect(outOfView(r(30, 67), r(50, 400))).toBe(false);
    expect(outOfView(r(410, 447), r(50, 400))).toBe(true);
  });
});

const schools: SelectOption[] = [
  { value: 'u1', label: 'University of Lagos', meta: 'Nigeria' },
  { value: 'u2', label: 'University of Ghana', meta: 'Ghana' },
];

function Search(p: Props & { onCustom?: (t: string) => void; onPick?: (v: string) => void }) {
  const [query, setQuery] = useState('');
  const [value, setValue] = useState('');
  return (
    <>
      <label htmlFor="school">School</label>
      <Select
        id="school"
        searchable
        allowCustom
        options={schools}
        {...p}
        query={query}
        onQueryChange={(q) => {
          setQuery(q);
          setValue('');
        }}
        value={value}
        onChange={(e, o) => {
          setValue(e.target.value);
          setQuery(o.label);
          p.onPick?.(e.target.value);
        }}
      />
      <button type="button">After</button>
    </>
  );
}
const box = () => screen.getByRole('combobox', { name: 'School' });

describe('Select searchable', () => {
  it('is a text box combobox that filters, with grey meta on rows', async () => {
    const user = userEvent.setup();
    render(<Search allowCustom={false} />);
    expect(box()).toHaveAttribute('aria-autocomplete', 'list');
    await user.type(box(), 'gha');
    const rows = screen.getAllByRole('option');
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveTextContent('University of GhanaGhana');
    expect(screen.getByRole('status')).toHaveTextContent('1 match');
  });

  it('Down then Enter picks a row: its id and name', async () => {
    const user = userEvent.setup();
    const onPick = vi.fn();
    render(<Search onPick={onPick} />);
    await user.type(box(), 'univ');
    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}');
    expect(onPick).toHaveBeenCalledWith('u2');
    expect(box()).toHaveValue('University of Ghana');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('read-only: typing does nothing and the list stays shut', async () => {
    const user = userEvent.setup();
    render(<Search readOnly />);
    expect(box()).toHaveAttribute('aria-readonly', 'true');
    expect(box()).toHaveAttribute('readonly');
    await user.click(box());
    await user.type(box(), 'Lagos');
    await user.keyboard('{ArrowDown}');
    expect(box()).toHaveValue('');
    expect(box()).toHaveFocus();
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('no match on a plain list says so; leaving puts the text back', async () => {
    const user = userEvent.setup();
    render(<Plain searchable options={lengths} />);
    await user.clear(field());
    await user.type(field(), 'zz');
    expect(screen.getByText('No matches for “zz”.', { selector: 'div' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('No matches for “zz”.');
    expect(screen.queryByRole('option')).toBeNull();
    await user.tab();
    expect(field()).toHaveValue('60 min');
  });

  it('Escape closes the list and restores a plain list', async () => {
    const user = userEvent.setup();
    render(<Plain searchable options={lengths} />);
    await user.clear(field());
    await user.type(field(), '9');
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(field()).toHaveValue('60 min');
  });

  it('remote: shows Searching…, then the failed line with Try again', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    const { rerender } = render(<Search remote options={[]} status="loading" />);
    await user.type(box(), 'lag');
    expect(screen.getByText('Searching…', { selector: 'div' })).toBeInTheDocument();
    rerender(<Search remote options={[]} status="error" onRetry={onRetry} />);
    expect(
      screen.getByText('We couldn’t load this list.', { selector: 'span:not([role])' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalled();
    // The typed text can still be kept while the search is down.
    expect(screen.getByRole('option', { name: 'Use “lag”' })).toBeInTheDocument();
  });

  it('remote: nothing shows before anything is typed', async () => {
    const user = userEvent.setup();
    render(<Search remote options={[]} />);
    await user.click(box());
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(box()).toHaveAttribute('aria-expanded', 'false');
  });
});

describe('Select allowCustom', () => {
  it('ends the list with Use "{typed}" when nothing matches exactly', async () => {
    const user = userEvent.setup();
    render(<Search />);
    await user.type(box(), 'University of');
    const rows = screen.getAllByRole('option');
    expect(rows.at(-1)).toHaveTextContent('Use “University of”');
    await user.clear(box());
    await user.type(box(), 'university of lagos');
    expect(screen.queryByRole('option', { name: /^Use/ })).toBeNull();
  });

  it('Enter with nothing highlighted keeps the typed text, with no id', async () => {
    const user = userEvent.setup();
    const onCustom = vi.fn();
    const onPick = vi.fn();
    render(<Search onCustom={onCustom} onPick={onPick} />);
    await user.type(box(), 'Kwame Nkrumah University');
    await user.keyboard('{Enter}');
    expect(onCustom).toHaveBeenCalledWith('Kwame Nkrumah University');
    expect(onPick).not.toHaveBeenCalled();
    expect(box()).toHaveValue('Kwame Nkrumah University');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('onHighlight is null while Use "{typed}" or nothing is active', async () => {
    const user = userEvent.setup();
    const onHighlight = vi.fn();
    render(<Search onHighlight={onHighlight} />);
    screen.getByRole('combobox', { name: 'School' }).focus();
    await user.keyboard('uni');
    expect(onHighlight).not.toHaveBeenCalled();
    await user.keyboard('{ArrowDown}');
    expect(onHighlight).toHaveBeenLastCalledWith(schools[0]);
    await user.keyboard('{ArrowDown}{ArrowDown}');
    expect(onHighlight.mock.calls.map(([o]) => o?.value ?? null)).toEqual(['u1', 'u2', null]);
  });

  it('picking the Use row keeps the text', async () => {
    const user = userEvent.setup();
    const onCustom = vi.fn();
    render(<Search onCustom={onCustom} />);
    await user.type(box(), 'Unilag');
    await user.click(screen.getByRole('option', { name: 'Use “Unilag”' }));
    expect(onCustom).toHaveBeenCalledWith('Unilag');
  });

  it('leaving the field keeps the typed text', async () => {
    const user = userEvent.setup();
    const onCustom = vi.fn();
    render(<Search onCustom={onCustom} />);
    await user.type(box(), 'Covenant');
    await user.tab();
    expect(onCustom).toHaveBeenCalledWith('Covenant');
    expect(box()).toHaveValue('Covenant');
  });

  it('a click outside keeps the typed text too, once', async () => {
    const user = userEvent.setup();
    const onCustom = vi.fn();
    render(<Search onCustom={onCustom} />);
    await user.type(box(), 'Babcock');
    await user.click(document.body);
    expect(onCustom).toHaveBeenCalledTimes(1);
    expect(onCustom).toHaveBeenCalledWith('Babcock');
    expect(screen.queryByRole('listbox')).toBeNull();
  });
});

describe('Select, review of PR 427', () => {
  it('inside a wrapping <label>, a picked row closes the list', async () => {
    const user = userEvent.setup();
    function Wrapped() {
      const [v, setV] = useState('60');
      return (
        <label>
          Length
          <Select options={lengths} value={v} onChange={(e) => setV(e.target.value)} />
        </label>
      );
    }
    render(<Wrapped />);
    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByRole('option', { name: '90 min' }));
    expect(screen.getByRole('combobox')).toHaveValue('90');
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('required sets aria-required on both kinds of field', () => {
    render(
      <>
        <Plain required />
        <Search required />
      </>,
    );
    expect(field()).toHaveAttribute('aria-required', 'true');
    expect(box()).toHaveAttribute('aria-required', 'true');
  });

  it('not required: no aria-required at all', () => {
    render(<Plain />);
    expect(field()).not.toHaveAttribute('aria-required');
  });

  it('a failed search is announced as failed, not as no match', async () => {
    const user = userEvent.setup();
    render(<Search remote allowCustom={false} options={[]} status="error" />);
    await user.type(box(), 'lag');
    expect(screen.getByRole('status')).toHaveTextContent('We couldn’t load this list.');
  });

  it('while searching it says so; under the minimum it says nothing', async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <Search remote allowCustom={false} minChars={2} options={[]} status="loading" />,
    );
    await user.type(box(), 'l');
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
    expect(screen.queryByRole('listbox')).toBeNull();
    await user.type(box(), 'a');
    expect(screen.getByRole('status')).toHaveTextContent('Searching…');
    rerender(<Search remote allowCustom={false} minChars={2} options={[]} status="ready" />);
    expect(screen.getByRole('status')).toHaveTextContent('No matches for “la”.');
  });

  it('with only a status line, the listbox it points at exists', async () => {
    const user = userEvent.setup();
    render(<Search remote allowCustom={false} options={[]} status="loading" />);
    await user.type(box(), 'lag');
    expect(box()).toHaveAttribute('aria-expanded', 'true');
    const list = document.getElementById(box().getAttribute('aria-controls')!);
    expect(list).toHaveAttribute('role', 'listbox');
  });

  it('Try again by keyboard: focus goes back to the field', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(<Search remote options={[]} status="error" onRetry={onRetry} />);
    await user.type(box(), 'lag');
    await user.tab();
    expect(screen.getByRole('button', { name: 'Try again' })).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(onRetry).toHaveBeenCalled();
    expect(box()).toHaveFocus();
  });

  it('Escape on Try again closes the list and returns to the field', async () => {
    const user = userEvent.setup();
    render(<Search remote options={[]} status="error" onRetry={vi.fn()} />);
    await user.type(box(), 'lag');
    await user.tab();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(box()).toHaveFocus();
  });

  it('tabbing past Try again closes the list', async () => {
    const user = userEvent.setup();
    render(<Search remote options={[]} status="error" onRetry={vi.fn()} />);
    await user.type(box(), 'lag');
    await user.tab();
    await user.tab();
    expect(screen.getByRole('button', { name: 'After' })).toHaveFocus();
    expect(screen.queryByRole('listbox')).toBeNull();
  });
});
