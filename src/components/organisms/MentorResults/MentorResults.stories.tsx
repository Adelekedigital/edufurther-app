import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import type { Mentor } from '@/types/mentor';
import { MentorCard } from '../MentorCard/MentorCard';
import { MentorCardSkeleton } from '../MentorCard/MentorCardSkeleton';
import { MentorResults } from './MentorResults';

const soon = new Date(Date.now() + 3 * 3600_000).toISOString();

export const sampleMentors: Mentor[] = [
  {
    id: 'm1',
    profileHref: '/mentors/olajuwon',
    name: 'Olajuwon Samuel',
    firstName: 'Olajuwon',
    initials: 'OS',
    photoUrl: null,
    tone: 1,
    degreeLine: 'MSc, Computer Science',
    institution: 'University of London',
    completedSessions: 23,
    reviewCount: 11,
    rating: 4.9,
    label: 'top-rated',
    nextAvailableAt: soon,
    topics: [
      { slug: 'a', label: 'Scholarships & funding' },
      { slug: 'b', label: 'Application documents' },
    ],
  },
  {
    id: 'm2',
    profileHref: '/mentors/adaeze',
    name: 'Adaeze Okonkwo',
    firstName: 'Adaeze',
    initials: 'AO',
    photoUrl: null,
    tone: 4,
    degreeLine: 'MSc, Data Science',
    institution: 'University of Manchester',
    completedSessions: 0,
    reviewCount: 0,
    rating: null,
    label: 'rising',
    nextAvailableAt: soon,
    topics: [{ slug: 'b', label: 'Application documents' }],
  },
  {
    id: 'm3',
    profileHref: '/mentors/jesuah',
    name: 'Jesuah Mica',
    firstName: 'Jesuah',
    initials: 'JM',
    photoUrl: null,
    tone: 5,
    degreeLine: 'MSc, Computer Science',
    institution: 'University of London',
    completedSessions: 52,
    reviewCount: 4,
    rating: 4.9,
    label: 'experienced',
    nextAvailableAt: null,
    topics: [{ slug: 'c', label: 'Program selection' }],
  },
  {
    id: 'm4',
    profileHref: '/mentors/chukwueze',
    name: 'Chukwueze Morgan-Stanley Adebayo-Williamson',
    firstName: 'Chukwueze',
    initials: 'CM',
    photoUrl: null,
    tone: 3,
    degreeLine: 'MBA, Strategy and International Business Development',
    institution: 'Rotman School of Management, University of Toronto',
    completedSessions: 12,
    reviewCount: 0,
    rating: null,
    label: null,
    nextAvailableAt: soon,
    topics: [
      { slug: 'd', label: 'Career guidance' },
      { slug: 'a', label: 'Scholarships & funding' },
    ],
  },
];

const meta: Meta<typeof MentorResults> = {
  title: 'Organisms/MentorResults',
  component: MentorResults,
  args: {
    mentors: sampleMentors,
    isLoading: false,
    isRefreshing: false,
    error: null,
    onRetry: fn(),
    countLabel: '57 mentors for 2 topics',
    total: 57,
    timeZone: 'Africa/Lagos',
    hasFilters: true,
    query: '',
    onClearSearch: fn(),
    onBook: fn(),
    offline: false,
    restarted: false,
    onDismissRestarted: fn(),
    hasMore: true,
    isLoadingMore: false,
    loadMoreError: null,
    onLoadMore: fn(),
  },
};
export default meta;
type Story = StoryObj<typeof MentorResults>;

export const Content: Story = {};
export const Loading: Story = { args: { isLoading: true } };
export const Refreshing: Story = { args: { isRefreshing: true } };
export const Error: Story = { args: { error: { kind: 'server', message: 'x' } } };
export const ErrorOffline: Story = { args: { error: { kind: 'offline', message: 'x' } } };
export const EmptyFiltered: Story = { args: { mentors: [], query: 'zzz' } };
export const EmptyNoMentorsAtAll: Story = { args: { mentors: [], hasFilters: false } };
export const Offline: Story = { args: { offline: true } };
export const Restarted: Story = { args: { restarted: true } };
export const LoadingMore: Story = { args: { isLoadingMore: true } };
export const LoadMoreError: Story = { args: { loadMoreError: { kind: 'server', message: 'x' } } };
export const End: Story = { args: { hasMore: false } };
export const CountUnknown: Story = { args: { total: null, countLabel: 'Mentors for 2 topics' } };
export const Narrow: Story = { globals: { viewport: { value: 'mobile1' } } };

export const Cards: StoryObj = {
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 320px)', gap: 16 }}>
      {sampleMentors.map((m) => (
        <MentorCard key={m.id} mentor={m} onBook={fn()} timeZone="Africa/Lagos" />
      ))}
      <MentorCard mentor={sampleMentors[0]!} onBook={fn()} timeZone="Africa/Lagos" offline />
      <MentorCardSkeleton />
    </div>
  ),
};
