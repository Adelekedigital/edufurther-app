import { personInitials } from '@/lib/utils/person';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import { fn } from 'storybook/test';
import { MentorCoverCard } from '@/components/organisms/MentorCard/MentorCoverCard';
import { previewPlace, type MentorProfileGap } from '@/lib/copy/mentorSettings';
import { coverVars, topicIcon } from '@/lib/utils/cover';
import type { MentorProfileValues } from '@/types/mentorSettings';
import { MentorProfileForm } from './MentorProfileForm';

/** Mentor Settings.dc.html, the Profile tab (`isProfile`, previewLayout=real). */
const storyInitials = (name: string) => {
  const [first = '', ...rest] = name.trim().split(/\s+/);
  return personInitials(first, rest.at(-1), 'E');
};

const meta: Meta = { title: 'Settings/Mentor profile', parameters: { layout: 'padded' } };
export default meta;
type Story = StoryObj;

const COUNTRIES = [
  { id: 'ng', label: 'Nigeria' },
  { id: 'gh', label: 'Ghana' },
  { id: 'us', label: 'United States' },
  { id: 'uk', label: 'United Kingdom' },
];
const COMMON = [
  'English',
  'French',
  'Yoruba',
  'Swahili',
  'Hausa',
  'Igbo',
  'Arabic',
  'Portuguese',
].map((label) => ({ id: label.toLowerCase(), label }));
const TOPICS = ['School selection', 'Scholarships and financial aid', 'Document preparation'];

const filled: MentorProfileValues = {
  name: 'Elufisan Ganiyu',
  headline: 'PhD Sociology · Mississippi State University',
  about:
    'Fully funded PhD at Mississippi State. I help graduate applicants shortlist programs, sharpen their statement of purpose and find assistantships that cover tuition.',
  aboutDrafted: false,
  originId: 'ng',
  studyId: 'us',
  gender: '',
  languages: [COMMON[0]!, COMMON[2]!],
};

function Live({
  initial,
  errors = [],
  headlineTooLong = false,
  photoUrl = null,
}: {
  initial: MentorProfileValues;
  errors?: MentorProfileGap[];
  headlineTooLong?: boolean;
  photoUrl?: string | null;
}) {
  const [v, setV] = useState(initial);
  const { bg, ink } = coverVars('sky');
  const icons = TOPICS.map(topicIcon);
  const name = (id: string) => COUNTRIES.find((c) => c.id === id)?.label ?? null;
  return (
    <div style={{ maxWidth: 1040 }}>
      <MentorProfileForm
        values={v}
        onChange={(patch) => setV((x) => ({ ...x, ...patch }))}
        errors={errors}
        headlineTooLong={headlineTooLong}
        countries={{ origin: COUNTRIES, study: COUNTRIES }}
        photo={{
          person: { initials: storyInitials(v.name), cover: 'sky', src: photoUrl },
          upload: {
            accept: 'image/png',
            upload: fn(),
            uploading: false,
            removing: false,
            error: null,
            errorFrom: null,
            removedStamp: 0,
            remove: fn(),
            dismissError: fn(),
          },
          onRemove: fn(),
        }}
        cover={{ bg, ink, bannerUrl: null, art: 'icons', artIcons: icons }}
        languages={{
          common: COMMON,
          query: '',
          onQueryChange: fn(),
          results: [],
          status: 'ready',
        }}
        preview={
          <MentorCoverCard
            name={v.name || 'Your name'}
            headline={v.headline}
            initials={storyInitials(v.name)}
            photoUrl={photoUrl}
            cover="sky"
            bannerUrl={null}
            artIcons={icons}
            art="icons"
            rating={4.9}
            reviewCount={7}
            completedSessions={51}
            place={previewPlace(name(v.originId), name(v.studyId))}
            tags={TOPICS}
            copy={{ book: 'Book a session', message: 'Message' }}
          />
        }
      />
    </div>
  );
}

export const Filled: Story = { render: () => <Live initial={filled} /> };

export const SavedWithGaps: Story = {
  render: () => (
    <Live
      initial={{ ...filled, headline: '', originId: '', studyId: '', languages: [] }}
      errors={['headline', 'origin', 'study']}
    />
  ),
};

export const HeadlineTooLong: Story = {
  render: () => (
    <Live initial={{ ...filled, headline: 'x'.repeat(81) }} errors={['headline']} headlineTooLong />
  ),
};

export const LongNameAndHeadline: Story = {
  render: () => (
    <Live
      initial={{
        ...filled,
        name: 'Oluwaseyifunmi Adebanjo-Okonkwo-Williams',
        headline: 'MSc Global Health Policy · London School of Hygiene and Tropical Medicine',
      }}
    />
  ),
};

export const Empty: Story = {
  render: () => (
    <Live
      initial={{
        ...filled,
        name: '',
        headline: '',
        about: '',
        originId: '',
        studyId: '',
        languages: [],
      }}
    />
  ),
};

export const Phone: Story = {
  globals: { viewport: { value: 'mobile2', isRotated: false } },
  render: () => <Live initial={filled} />,
};
