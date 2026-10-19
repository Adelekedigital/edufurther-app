import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { reapplyMailto } from '@/lib/copy/mentorApplication';
import type { SummaryRow } from '@/components/molecules/ApprovedSummary/ApprovedSummary';
import {
  MentorApplicationStatus,
  type CalendarConnectState,
  type MentorApplicationStatusProps,
} from './MentorApplicationStatus';

const meta: Meta<typeof MentorApplicationStatus> = {
  title: 'Organisms/MentorApplicationStatus',
  component: MentorApplicationStatus,
};
export default meta;
type Story = StoryObj<typeof MentorApplicationStatus>;

const note =
  'We couldn’t match the PhD on your application to your LinkedIn profile. Add it to LinkedIn, or check that the school and years match, then contact us to apply again.';

export const InReview: Story = {
  args: { state: 'pending', email: 'gbenga@example.com' },
};

const summary: SummaryRow[] = [
  {
    icon: 'schedule',
    title: 'Weekly hours drafted',
    body: 'Mon–Fri, 6:00 pm – 9:00 pm (Africa/Lagos). Change them any time.',
    link: { label: 'Check hours', href: '/calendar' },
  },
  {
    icon: 'video_chat',
    title: 'Intro chat is ready to book',
    body: 'Free, 30 min, 1:1 video. Add more sessions later.',
    link: { label: 'Edit', href: '/session-types/1/edit' },
  },
  {
    icon: 'travel_explore',
    title: 'You’re listed on Explore',
    body: 'Mentees can find and book you straight away.',
  },
];

const approved: MentorApplicationStatusProps = {
  state: 'approved',
  firstName: 'Gbenga',
  celebrate: false,
  calendar: { state: 'idle', onConnect: () => {} },
  dashboardHref: '/dashboard',
  summary,
};

export const Approved: Story = { args: approved };

const withCalendar = (state: CalendarConnectState, email?: string): MentorApplicationStatusProps =>
  ({
    ...approved,
    calendar: { state, email, onConnect: () => {} },
  }) as MentorApplicationStatusProps;

/** The Google Calendar row in each state it can be in. */
export const CalendarChecking: Story = { args: withCalendar('loading') };
export const CalendarConnecting: Story = { args: withCalendar('busy') };
export const CalendarConnected: Story = { args: withCalendar('connected', 'gbenga@gmail.com') };
export const CalendarConnectedNoEmail: Story = { args: withCalendar('connected') };
export const CalendarRevoked: Story = { args: withCalendar('revoked') };
export const CalendarBlocked: Story = { args: withCalendar('blocked') };
export const CalendarNothingConnected: Story = { args: withCalendar('nothingConnected') };
export const CalendarOffline: Story = { args: withCalendar('offline') };
export const CalendarFailed: Story = { args: withCalendar('failed') };
export const CalendarUnavailable: Story = { args: withCalendar('unavailable') };

/** Hours and Intro chat couldn't be read: only what's true is said. */
export const ApprovedListedOnly: Story = { args: { ...approved, summary: summary.slice(2) } };

export const ApprovedLongName: Story = {
  args: { ...approved, firstName: 'Oluwaseyifunmi-Adebayo' },
};

const declined: MentorApplicationStatusProps = {
  state: 'declined',
  firstName: 'Gbenga',
  email: 'gbenga.ekundayo.longaddress@example-university.edu.ng',
  note,
  reviewDate: 'Oct 14, 2026',
  mailto: reapplyMailto({
    name: 'Gbenga Ekundayo',
    first: 'Gbenga',
    email: 'gbenga@example.com',
    reviewDate: 'Oct 14, 2026',
    note,
  }),
  menteeHref: '/onboarding/mentee',
  menteePending: false,
  menteeFailed: false,
  onContinueAsMentee: () => {},
};

export const NotApproved: Story = { args: declined };

export const NotApprovedSwitchFailed: Story = { args: { ...declined, menteeFailed: true } };

export const Loading: Story = { args: { state: 'loading' } };

export const Error: Story = { args: { state: 'error', onRetry: () => {} } };
