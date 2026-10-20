import { personInitials } from '@/lib/utils/person';
import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import type { LanguageOption } from '@/components/molecules/LanguageChips/LanguageChips';
import type { ProfileGap } from '@/lib/copy/settings';
import { MenteeProfileForm, type MenteeProfileValues } from './MenteeProfileForm';

const meta: Meta = { title: 'Organisms/MenteeProfileForm' };
export default meta;
type Story = StoryObj;

const COUNTRIES = [
  'Canada',
  'Ghana',
  'Kenya',
  'Nigeria',
  'South Africa',
  'United Kingdom',
  'United States',
].map((label) => ({ id: label.toLowerCase().replace(/\W+/g, '-'), label }));

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
];

/** The design's `draft-text`. */
const DRAFT =
  'I finished my BSc in Microbiology at the University of Lagos and I’m applying for a Master’s in Public Health in the UK or Canada, with a focus on scholarships.';

const EMPTY: MenteeProfileValues = {
  name: '',
  countryId: '',
  languages: [],
  bio: '',
  bioDrafted: false,
};
const FILLED: MenteeProfileValues = {
  name: 'Amaka Obi',
  countryId: 'nigeria',
  languages: [COMMON[0]!, COMMON[3]!],
  bio: DRAFT,
  bioDrafted: false,
};

const photo = (name: string) => ({
  url: null,
  initial:
    personInitials(name.trim().split(/\s+/)[0], name.trim().split(/\s+/).slice(1).at(-1)) || '?',
  name,
  accept: 'image/jpeg,image/png',
  uploading: false,
  removing: false,
  error: null,
  errorFrom: null,
  removedStamp: 0,
  onFile: fn(),
  onRemove: fn(),
  onRetryRemove: fn(),
  onDismissError: fn(),
});

/** Holds the values and the language query, as the page would. */
function Form({
  initial,
  errors = [],
}: {
  initial: MenteeProfileValues;
  errors?: readonly ProfileGap[];
}) {
  const [values, setValues] = useState(initial);
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  return (
    <MenteeProfileForm
      values={values}
      onChange={(patch) => setValues((v) => ({ ...v, ...patch }))}
      errors={errors}
      countries={COUNTRIES}
      photo={photo(values.name)}
      languages={{
        common: COMMON,
        query,
        onQueryChange: setQuery,
        results: q ? CATALOG.filter((l) => l.label.toLowerCase().startsWith(q)) : [],
        status: 'ready',
      }}
      onAssist={(mode, text) =>
        new Promise((resolve) => setTimeout(() => resolve(mode === 'draft' ? DRAFT : text), 600))
      }
    />
  );
}

export const Filled: Story = { render: () => <Form initial={FILLED} /> };
export const Empty: Story = { render: () => <Form initial={EMPTY} /> };
/** Save was tried with every required field blank. */
export const WithErrors: Story = {
  render: () => <Form initial={EMPTY} errors={['name', 'country', 'langs']} />,
};
/** The bio is still the untouched AI draft. */
export const DraftedBio: Story = {
  render: () => <Form initial={{ ...FILLED, bioDrafted: true }} />,
};
