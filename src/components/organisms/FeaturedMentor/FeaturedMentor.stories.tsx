import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { MatchPrompt } from '@/components/molecules/MatchPrompt/MatchPrompt';
import type { FeaturedMentor as Featured } from '@/types/mentor';
import { FeaturedMentor } from './FeaturedMentor';

const featured: Featured = {
  id: 'm-aderewa',
  profileHref: '/mentors/aderewa-oluchi',
  name: 'Aderewa Oluchi',
  firstName: 'Aderewa',
  initials: 'AO',
  photoUrl: null,
  photoFocus: null,
  tone: 2,
  degreeLine: 'MSc, Public Health',
  institution: 'University of London',
  completedSessions: 122,
  reviewCount: 34,
  rating: 4.9,
  label: 'top-rated',
  offer: 'free',
  nextAvailableAt: new Date(Date.now() + 30 * 3600_000).toISOString(),
  nextAvailableState: 'open',
  topics: [],
  bio: 'I’m a medical doctor and public health professional. I love meeting people and sharing what I’ve learned, and it’s a privilege to guide others through the application journey.',
};

const meta: Meta<typeof FeaturedMentor> = {
  title: 'Organisms/FeaturedMentor',
  component: FeaturedMentor,
  args: { mentor: featured, onBook: fn(), timeZone: 'Africa/Lagos' },
};
export default meta;
type Story = StoryObj<typeof FeaturedMentor>;

export const Default: Story = {};
export const NoNextSlot: Story = {
  args: { mentor: { ...featured, nextAvailableAt: null, nextAvailableState: 'none' } },
};
/** Availability unknown (refreshing) and no offer: no bottom block, no extra gap. */
export const NoOfferNoSlot: Story = {
  args: {
    mentor: { ...featured, offer: null, nextAvailableAt: null, nextAvailableState: 'unknown' },
  },
};
export const Offline: Story = { args: { offline: true } };
export const LongBio: Story = {
  args: { mentor: { ...featured, bio: (featured.bio ?? '').repeat(4) } },
};
/** about_me is optional: no bio, no empty paragraph. */
export const NoBio: Story = { args: { mentor: { ...featured, bio: null } } };

export const MatchPromptMentee: StoryObj = {
  render: () => (
    <MatchPrompt
      href="https://example.invalid/match"
      external
      body="Share your goals and we’ll suggest mentors who fit your path, so your first sessions count."
    />
  ),
};
export const MatchPromptGuest: StoryObj = {
  render: () => (
    <MatchPrompt
      href="https://example.invalid/match"
      external
      body="Tell us your goals and we’ll suggest mentors who’ve already been where you’re going."
    />
  ),
};
