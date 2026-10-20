import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { FIELD_ERRORS, NOT_SURE } from '@/lib/copy/onboarding';
import { EMPTY_PLANS, missingPlans } from '@/lib/utils/onboardingAnswers';
import type { PlanAnswers } from '@/types/onboarding';
import type { Mentor } from '@/types/mentor';
import type { MentorMatch } from '@/types/onboarding';
import { HelpAreaPicker } from './HelpAreaPicker/HelpAreaPicker';
import { MatchResults, type MatchResultsProps } from './MatchResults/MatchResults';
import { MentorCard } from './MentorCard/MentorCard';
import { StudyPlansForm } from './StudyPlansForm/StudyPlansForm';

const meta: Meta = { title: 'Organisms/Onboarding' };
export default meta;
type Story = StoryObj;

const OFFERINGS = [
  { id: 'o1', slug: 'interview-preparation', label: 'Interview preparation' },
  { id: 'o2', slug: 'document-preparation', label: 'Document preparation' },
  { id: 'o3', slug: 'school-selection', label: 'School selection' },
  { id: 'o4', slug: 'program-selection', label: 'Program selection' },
  { id: 'o5', slug: 'test-preparation', label: 'Test preparation' },
  { id: 'o6', slug: 'scholarships-financial-aid', label: 'Scholarships and financial aid' },
];
const TOPICS = OFFERINGS.map(({ slug, label }) => ({ slug, label }));

const COUNTRIES = [
  'Australia',
  'Canada',
  'Côte d’Ivoire',
  'France',
  'Germany',
  'Ghana',
  'Ireland',
  'Kenya',
  'Netherlands',
  'Nigeria',
  'United Kingdom',
  'United States',
].map((label) => ({ id: label.toLowerCase().replace(/\W+/g, '-'), label }));

function Picker({ initial, extra = [] }: { initial: string[]; extra?: typeof OFFERINGS }) {
  const [value, setValue] = useState(initial);
  return (
    <div style={{ maxWidth: 640 }}>
      <HelpAreaPicker
        options={[...OFFERINGS, ...extra]}
        value={value}
        onChange={setValue}
        limit={3}
        label="What would you like help with?"
      />
    </div>
  );
}
export const HelpAreasNone: Story = { render: () => <Picker initial={[]} /> };
export const HelpAreasAtLimit: Story = { render: () => <Picker initial={['o4', 'o2', 'o6']} /> };
export const HelpAreasUnknownSlug: Story = {
  render: () => (
    <Picker
      initial={[]}
      extra={[{ id: 'o7', slug: 'career-guidance', label: 'Career guidance' }]}
    />
  ),
};

function Plans({ initial, marked }: { initial: PlanAnswers; marked?: boolean }) {
  const [value, setValue] = useState(initial);
  // As the page does once Continue was pressed: each gap marked, cleared as it's answered.
  const errors = marked
    ? Object.fromEntries(missingPlans(value).map((g) => [g, FIELD_ERRORS[g]]))
    : undefined;
  return (
    <div style={{ maxWidth: 480 }}>
      <StudyPlansForm countries={COUNTRIES} value={value} onChange={setValue} errors={errors} />
    </div>
  );
}
export const StudyPlansEmpty: Story = { render: () => <Plans initial={EMPTY_PLANS} /> };
export const StudyPlansMissingMarked: Story = {
  render: () => <Plans initial={{ ...EMPTY_PLANS, degree: 'mba' }} marked />,
};
export const StudyPlansFilled: Story = {
  render: () => (
    <Plans
      initial={{
        originId: 'nigeria',
        degree: 'mba',
        field: 'Business Administration',
        destinationId: NOT_SURE,
      }}
    />
  ),
};

const soon = new Date(Date.now() + 26 * 3600_000).toISOString();
const mentor = (over: Partial<Mentor>): Mentor => ({
  id: 'm1',
  profileHref: '/mentors/jesuah-mica',
  name: 'Jesuah Mica',
  firstName: 'Jesuah',
  initials: 'JM',
  photoUrl: null,
  photoFocus: null,
  cover: 'lilac',
  degreeLine: 'MSc, Computer Science',
  institution: 'University of London',
  completedSessions: 23,
  reviewCount: 11,
  rating: 4.9,
  label: 'top-rated',
  originCountry: 'Ghana',
  studyCountry: 'United Kingdom',
  offer: 'free',
  nextAvailableAt: soon,
  nextAvailableState: 'open',
  takingBookings: true,
  topics: TOPICS.slice(0, 5),
  ...over,
});

const MATCHES: MentorMatch[] = [
  {
    mentor: mentor({}),
    reasons: [
      { code: 'study_country', country: { id: 'gb', label: 'United Kingdom' } },
      { code: 'degree', level: 'Master’s' },
      { code: 'help_areas', slugs: ['scholarships-financial-aid', 'document-preparation'] },
    ],
    level: 'Master’s',
    studyCountry: 'United Kingdom',
  },
  {
    mentor: mentor({
      id: 'm2',
      profileHref: '/mentors/adebanjo-maria',
      name: 'Adebanjo Maria',
      firstName: 'Adebanjo',
      initials: 'AM',
      cover: 'rose',
      degreeLine: 'PhD, Business Administration',
      reviewCount: 4,
      completedSessions: 12,
      rating: 4.8,
      label: null,
      topics: TOPICS.slice(2, 5),
    }),
    reasons: [],
    level: 'PhD',
    studyCountry: 'United Kingdom',
  },
];

const results: MatchResultsProps = {
  matches: MATCHES,
  exact: true,
  basis: {
    degree: 'Master’s',
    field: 'Computer Science',
    country: 'United Kingdom',
    origin: 'Ghana',
  },
  isLoading: false,
  error: null,
  onRetry: fn(),
  highlight: ['scholarships-financial-aid', 'document-preparation'],
  compact: false,
  timeZone: 'Africa/Lagos',
  offline: false,
  onBook: fn(),
  onEdit: fn(),
  browseHref: '/explore',
};
const Results = (over: Partial<MatchResultsProps>) => (
  <div style={{ maxWidth: 960 }}>
    <MatchResults {...results} {...over} />
  </div>
);
export const MatchesContent: Story = { render: () => <Results /> };
export const MatchesCompact: Story = { render: () => <Results compact /> };
export const MatchesOne: Story = { render: () => <Results matches={MATCHES.slice(0, 1)} /> };
export const MatchesNoExact: Story = { render: () => <Results exact={false} /> };
export const MatchesLoading: Story = { render: () => <Results matches={[]} isLoading /> };
export const MatchesError: Story = {
  render: () => <Results matches={[]} error={{ kind: 'server', message: 'x' }} />,
};
export const MatchesEmpty: Story = { render: () => <Results matches={[]} /> };
export const MatchesGuest: Story = {
  render: () => (
    <Results
      matches={MATCHES.slice(0, 1)}
      guest={{ firstName: MATCHES[0]!.mentor.firstName, available: true }}
    />
  ),
};
export const MatchesGuestUnavailable: Story = {
  render: () => <Results guest={{ firstName: 'Ada', available: false }} />,
};

export const CardSixTopicsHighlighted: Story = {
  render: () => (
    <div style={{ maxWidth: 360 }}>
      <MentorCard
        mentor={mentor({ topics: TOPICS })}
        onBook={fn()}
        timeZone="Africa/Lagos"
        highlight={['test-preparation']}
      />
    </div>
  ),
};
export const CardLongName: Story = {
  render: () => (
    <div style={{ maxWidth: 360 }}>
      <MentorCard
        mentor={mentor({
          name: 'Chukwueze Morgan-Stanley Adebayo-Williamson',
          firstName: 'Chukwueze',
          topics: TOPICS,
        })}
        onBook={fn()}
        timeZone="Africa/Lagos"
        variant="compact"
      />
    </div>
  ),
};
