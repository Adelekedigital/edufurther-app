import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { userEvent, within } from 'storybook/test';
import { PROFILE_COPY as C } from '@/lib/copy/settings';
import { LanguageChips, type LanguageOption } from './LanguageChips';

const meta: Meta = { title: 'Molecules/LanguageChips' };
export default meta;
type Story = StoryObj;

const COMMON: LanguageOption[] = [
  { id: 'en', label: 'English' },
  { id: 'fr', label: 'French' },
  { id: 'yo', label: 'Yoruba' },
  { id: 'ig', label: 'Igbo' },
  { id: 'ha', label: 'Hausa' },
];
const CATALOG: LanguageOption[] = [
  ...COMMON,
  { id: 'tw', label: 'Twi' },
  { id: 'sw', label: 'Swahili' },
  { id: 'pt', label: 'Portuguese' },
];

const COPY = {
  add: C.addLanguage,
  addButton: C.add,
  cancel: C.cancel,
  placeholder: C.addLanguagePlaceholder,
  searching: C.searchingLanguages,
  searchFailed: C.languageSearchFailed,
  noMatch: C.noLanguageMatch,
};

/** Holds the selection and the query, and searches the catalog by prefix. */
function Chips({ initialQuery = '' }: { initialQuery?: string }) {
  const [selected, setSelected] = useState<LanguageOption[]>([COMMON[0]!, COMMON[2]!]);
  const [query, setQuery] = useState(initialQuery);
  const q = query.trim().toLowerCase();
  const results = q ? CATALOG.filter((l) => l.label.toLowerCase().startsWith(q)) : [];
  return (
    <div style={{ maxWidth: 640 }}>
      <LanguageChips
        label={C.languages}
        common={COMMON}
        selected={selected}
        onToggle={(l) =>
          setSelected((s) =>
            s.some((x) => x.id === l.id) ? s.filter((x) => x.id !== l.id) : [...s, l],
          )
        }
        query={query}
        onQueryChange={setQuery}
        results={results}
        status="ready"
        copy={COPY}
      />
    </div>
  );
}

/** Open the adder: the story clicks "Add another language" and types the query. */
const openWith =
  (text: string): Story['play'] =>
  async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: C.addLanguage }));
    await userEvent.type(canvas.getByRole('combobox'), text);
  };

/** English and Yoruba picked. */
export const Default: Story = { render: () => <Chips /> };
/** "Add another language" open, "tw" typed: Twi is the one match. */
export const Adding: Story = { render: () => <Chips />, play: openWith('tw') };
/** Nothing in the catalog matches. */
export const NoMatch: Story = { render: () => <Chips />, play: openWith('zzz') };
