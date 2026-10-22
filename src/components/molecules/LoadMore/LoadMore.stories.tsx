import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { LoadMore } from './LoadMore';

const meta: Meta<typeof LoadMore> = {
  title: 'Molecules/LoadMore',
  component: LoadMore,
  args: { label: 'Show 5 more reviews', caption: 'Showing 5 of 13', onLoadMore: () => {} },
};
export default meta;
type Story = StoryObj<typeof LoadMore>;

export const Default: Story = {};

/** Explore: the caption above the button. */
export const CaptionFirst: Story = {
  args: { label: 'Show more mentors', caption: 'Showing 24 of 57 mentors', captionFirst: true },
};

/** The total isn't known: no caption. */
export const NoCaption: Story = { args: { caption: undefined } };

/** The next page is on its way. */
export const Busy: Story = {
  args: { label: 'Show more mentors', busy: true, busyLabel: 'Loading mentors…' },
};

/** Offline: the button stays, dimmed. */
export const Disabled: Story = { args: { disabled: true } };

/** The next page failed: the error row and Try again. */
export const Failed: Story = { args: { error: 'We couldn’t load more reviews.' } };

/** A phone. */
export const Narrow: Story = { decorators: [(S) => <div style={{ maxWidth: 358 }}>{S()}</div>] };
