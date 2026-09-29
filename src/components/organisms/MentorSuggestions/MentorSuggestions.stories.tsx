import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import type { Mentor } from '@/types/mentor';
import { MentorCard } from '../MentorCard/MentorCard';
import { sampleMentors } from '../MentorResults/MentorResults.stories';
import { MentorSuggestions } from './MentorSuggestions';

/** Mentor Profile.dc.html, the "profile isn't available" page's suggestions. */
const meta: Meta<typeof MentorSuggestions> = {
  title: 'Organisms/Mentor suggestions',
  component: MentorSuggestions,
  args: {
    title: 'Mentors with similar expertise',
    subtitle: 'They help with scholarships & funding and visa interview, and are taking bookings.',
    exploreHref: '/explore',
    onBook: fn(),
    timeZone: 'Africa/Lagos',
    loading: false,
    mentors: sampleMentors.slice(0, 3),
  },
};
export default meta;
type Story = StoryObj<typeof MentorSuggestions>;

export const Content: Story = {};
export const Loading: Story = { args: { loading: true, mentors: null } };
/** Renders nothing: the page keeps its own "Explore mentors". */
export const Empty: Story = { args: { mentors: [] } };
export const Phone: Story = { globals: { viewport: { value: 'mobile2', isRotated: false } } };
export const MentorViewer: Story = { args: { canBook: false } };

const longName: Mentor = {
  ...sampleMentors[0]!,
  id: 'long',
  name: 'Oluwadamilare Adebayo-Ogunleye Chukwuemeka',
  firstName: 'Oluwadamilare',
  initials: 'OA',
  label: 'experienced',
};

/** The compact card alone: long name with its label, no reviews, offline. */
export const CompactCards: StoryObj = {
  render: () => (
    <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(2, 320px)' }}>
      <MentorCard variant="compact" mentor={longName} onBook={fn()} timeZone="UTC" />
      <MentorCard
        variant="compact"
        mentor={{ ...sampleMentors[1]!, reviewCount: 0, rating: null, label: 'new' }}
        onBook={fn()}
        timeZone="UTC"
        offline
      />
    </div>
  ),
};
