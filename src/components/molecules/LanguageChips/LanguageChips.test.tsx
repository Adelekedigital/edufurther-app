import { act, render, screen } from '@testing-library/react';
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

function Chips({ failed }: { failed?: boolean }) {
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
          ? { text: 'We couldn’t load the language list.', retry: 'Try again', onRetry: () => {} }
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
});
