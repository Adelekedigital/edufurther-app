import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Button, ButtonLink } from '@/components/atoms/Button/Button';
import { ErrorPage } from './ErrorPage';

/** Error Page.dc.html: the types the app uses, with the actions their screens give them. */
const meta = {
  title: 'Organisms/ErrorPage',
  component: ErrorPage,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof ErrorPage>;
export default meta;
type Story = StoryObj<typeof meta>;

export const NotFoundMentee: Story = {
  args: {
    type: 'notFound',
    actions: (
      <>
        <ButtonLink href="/" size="large">
          Go to Home
        </ButtonLink>
        <ButtonLink href="/explore" size="large" variant="secondary-outlined">
          Find a mentor
        </ButtonLink>
      </>
    ),
  },
};

export const ServerErrorWithReference: Story = {
  args: {
    type: 'serverError',
    reference: 'EF-7Q2K9X',
    actions: (
      <>
        <Button size="large">Try again</Button>
        <ButtonLink href="/" size="large" variant="secondary-outlined">
          Go to Home
        </ButtonLink>
      </>
    ),
  },
};

/** Error tracking off: nothing to quote. */
export const ServerErrorNoReference: Story = {
  args: { ...ServerErrorWithReference.args, reference: null },
};

export const Standalone: Story = {
  args: {
    ...ServerErrorWithReference.args,
    header: (
      <header style={{ height: 72, borderBottom: '1px solid var(--ink-100)' }}>EduFurther</header>
    ),
  },
};
