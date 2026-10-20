import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { LanguageChips, type LanguageOption } from './LanguageChips';

const EN = { id: 'en', label: 'English' };
const TWI = { id: 'tw', label: 'Twi' };
const copy = {
  add: 'Add another language',
  addButton: 'Add',
  cancel: 'Cancel',
  placeholder: 'For example, Twi',
  searching: 'Searching…',
  searchFailed: 'We couldn’t search languages. Try again.',
  noMatch: (q: string) => `No languages match “${q}”.`,
};

function Chips({ failed, at = 1 }: { failed?: boolean; at?: number }) {
  const [selected, setSelected] = useState<LanguageOption[]>([EN]);
  const [query, setQuery] = useState('');
  return (
    <LanguageChips
      label="Languages you speak"
      common={[EN]}
      selected={selected}
      onToggle={(l) => setSelected((s) => [...s, l])}
      query={query}
      onQueryChange={setQuery}
      results={query ? [TWI] : []}
      status="ready"
      copy={copy}
      commonFailed={
        failed
          ? {
              text: 'We couldn’t load the language list.',
              retry: 'Try again',
              onRetry: () => {},
              at,
            }
          : undefined
      }
    />
  );
}

describe('LanguageChips', () => {
  it.each([
    ['Escape', async () => userEvent.keyboard('{Escape}')],
    ['Cancel', async () => userEvent.click(screen.getByRole('button', { name: 'Cancel' }))],
    ['a pick', async () => userEvent.keyboard('tw{Enter}')],
  ])('closing the adder by %s puts focus back on "Add another language"', async (_, close) => {
    render(<Chips />);
    await userEvent.click(screen.getByRole('button', { name: copy.add }));
    expect(screen.getByRole('combobox', { name: copy.add })).toHaveFocus();
    await close();
    await act(() => new Promise((r) => requestAnimationFrame(() => r(null))));
    expect(screen.getByRole('button', { name: copy.add })).toHaveFocus();
  });

  it('the list failing to load is said into a region that was there first', async () => {
    vi.useFakeTimers();
    render(<Chips failed />);
    const region = screen.getByRole('status');
    expect(region).toHaveTextContent('');
    act(() => vi.runAllTimers());
    expect(region).toHaveTextContent('We couldn’t load the language list.');
    vi.useRealTimers();
  });

  it('the same failure after Try again is put in afresh, so it is heard again', () => {
    vi.useFakeTimers();
    const { rerender } = render(<Chips failed at={1} />);
    act(() => vi.runAllTimers());
    const first = screen.getByRole('status').firstElementChild;
    rerender(<Chips failed at={2} />);
    act(() => vi.runAllTimers());
    expect(screen.getByRole('status').firstElementChild).not.toBe(first);
    expect(screen.getByRole('status')).toHaveTextContent('We couldn’t load the language list.');
    vi.useRealTimers();
  });
});

const ALL: LanguageOption[] = [
  { id: 'gb', label: 'United Kingdom' },
  { id: 'ca', label: 'Canada' },
  { id: 'se', label: 'Sweden' },
];

function AtLimit() {
  const [selected, setSelected] = useState<LanguageOption[]>([ALL[0]!, ALL[1]!]);
  const [query, setQuery] = useState('');
  return (
    <LanguageChips
      label="Countries"
      focusKey="countries"
      common={[ALL[0]!, ALL[1]!]}
      selected={selected}
      onToggle={(l) => setSelected((s) => (s.some((x) => x.id === l.id) ? s : [...s, l]))}
      full={selected.length >= 3}
      query={query}
      onQueryChange={setQuery}
      results={
        query ? ALL.filter((c) => c.label.toLowerCase().startsWith(query.toLowerCase())) : []
      }
      status="ready"
      copy={{
        add: 'Add another country',
        addButton: 'Add',
        cancel: 'Cancel',
        placeholder: 'For example, Sweden',
        searching: 'Searching…',
        searchFailed: 'Failed',
        noMatch: (q) => `No match for ${q}`,
      }}
    />
  );
}

describe('LanguageChips at its limit', () => {
  it('the pick that fills it returns focus to the group, not the now-disabled adder', async () => {
    render(<AtLimit />);
    await userEvent.click(screen.getByRole('button', { name: 'Add another country' }));
    await userEvent.type(screen.getByRole('combobox', { name: 'Add another country' }), 'swe');
    await userEvent.keyboard('{Enter}');
    expect(screen.getByRole('button', { name: 'Add another country' })).toBeDisabled();
    await waitFor(() => expect(screen.getByRole('group', { name: 'Countries' })).toHaveFocus());
  });

  describe('the "none" chip', () => {
    const DE = { id: 'de', label: 'Germany' };
    const CA = { id: 'ca', label: 'Canada' };
    const SE = { id: 'se', label: 'Sweden' };
    function Countries({ common, start }: { common: LanguageOption[]; start: LanguageOption[] }) {
      const [selected, setSelected] = useState(start);
      return (
        <LanguageChips
          label="Countries"
          common={common}
          selected={selected}
          onToggle={(l) =>
            setSelected((s) =>
              s.some((x) => x.id === l.id) ? s.filter((x) => x.id !== l.id) : [...s, l],
            )
          }
          full={selected.length >= 3}
          query=""
          onQueryChange={() => {}}
          results={[]}
          status="ready"
          copy={copy}
          none={{ label: 'Not sure yet', onPick: () => setSelected([]) }}
        />
      );
    }
    const names = () => screen.getAllByRole('button').map((b) => b.textContent);

    it('comes after the common chips, is pressed while nothing is picked, and clears the picks', async () => {
      render(<Countries common={[DE, CA]} start={[DE]} />);
      expect(names().slice(0, 3)).toEqual(['Germany', 'Canada', 'Not sure yet']);
      const notSure = screen.getByRole('button', { name: 'Not sure yet' });
      expect(notSure).toHaveAttribute('aria-pressed', 'false');
      await userEvent.click(notSure);
      expect(notSure).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByRole('button', { name: 'Germany' })).toHaveAttribute(
        'aria-pressed',
        'false',
      );
      await userEvent.click(screen.getByRole('button', { name: 'Canada' }));
      expect(notSure).toHaveAttribute('aria-pressed', 'false');
    });

    it('stays usable at the limit', () => {
      render(<Countries common={[DE, CA, SE]} start={[DE, CA, SE]} />);
      expect(screen.getByRole('button', { name: 'Not sure yet' })).toBeEnabled();
    });

    it('with no common chips, comes first, before the custom picks', () => {
      render(<Countries common={[]} start={[SE]} />);
      expect(names()[0]).toBe('Not sure yet');
    });
  });
});
