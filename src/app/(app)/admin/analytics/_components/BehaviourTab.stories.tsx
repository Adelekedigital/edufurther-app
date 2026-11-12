import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { ApiError } from '@/lib/api/data/errors';
import { BehaviourTab, type TabQuery } from './BehaviourTab';

const down = <T,>(): TabQuery<T> => ({
  status: 'error',
  data: undefined,
  error: new ApiError(503, 'PostHog unavailable', '/problems/analytics-upstream'),
  onRetry: fn(),
  retrying: false,
});

const meta: Meta<typeof BehaviourTab> = {
  title: 'Admin/Analytics/BehaviourTab',
  component: BehaviourTab,
  args: { funnel: 'signup', by: 'all', onFunnel: fn(), onBy: fn() },
};
export default meta;
type Story = StoryObj<typeof BehaviourTab>;

/** PostHog isn't answering: the failed-to-load state in the Funnels section. */
export const PostHogDown: Story = { args: { funnelQuery: down(), eventsQuery: down() } };
