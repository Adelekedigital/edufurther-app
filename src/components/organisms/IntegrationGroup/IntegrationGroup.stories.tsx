import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { Button } from '@/components/atoms/Button/Button';
import { IntegrationRow } from '@/components/molecules/IntegrationRow/IntegrationRow';
import { Notice } from '@/components/molecules/Notice/Notice';
import { IntegrationGroup } from './IntegrationGroup';

/** Integrations "Calendars", in each state the connection can be in. */
const meta: Meta = { title: 'Integrations/Integration group', parameters: { layout: 'padded' } };
export default meta;
type Story = StoryObj;

const DESC =
  'We check when you’re busy and hide those times from your booking page. We never edit your calendar.';

const Wrap = ({ children }: { children: React.ReactNode }) => (
  <div style={{ maxWidth: 880, display: 'grid', gap: 32 }}>{children}</div>
);

export const NotConnected: Story = {
  render: () => (
    <Wrap>
      <IntegrationGroup
        title="Calendars"
        description="Stop double-bookings and see sessions next to the rest of your week."
      >
        <IntegrationRow
          icon="calendar_month"
          tone="blue"
          label="Google Calendar"
          description={DESC}
          actions={<Button onClick={fn()}>Connect</Button>}
        />
      </IntegrationGroup>
    </Wrap>
  ),
};

export const Connected: Story = {
  render: () => (
    <Wrap>
      <IntegrationGroup
        title="Calendars"
        description="Stop double-bookings and see sessions next to the rest of your week."
      >
        <IntegrationRow
          icon="calendar_month"
          tone="blue"
          label="Google Calendar"
          description={DESC}
          // "Connected", not an account name: the API has no field for one.
          status={{ tone: 'good', text: 'Connected' }}
          actions={
            <Button variant="text-destructive" onClick={fn()}>
              Disconnect
            </Button>
          }
        />
      </IntegrationGroup>
    </Wrap>
  ),
};

/** `status: error` means reconnect — a transient failure never sets it. */
export const Broken: Story = {
  render: () => (
    <Wrap>
      <IntegrationGroup
        title="Calendars"
        description="Stop double-bookings and see sessions next to the rest of your week."
      >
        <IntegrationRow
          icon="calendar_month"
          tone="blue"
          label="Google Calendar"
          description={DESC}
          status={{
            tone: 'warn',
            text: 'Google Calendar needs reconnecting — access was removed or has expired.',
          }}
          actions={
            <>
              <Button onClick={fn()}>Reconnect</Button>
              <Button variant="text-destructive" onClick={fn()}>
                Disconnect
              </Button>
            </>
          }
        />
      </IntegrationGroup>
    </Wrap>
  ),
};

/** The live behaviour on every environment today: no Google client configured. */
export const Unavailable: Story = {
  render: () => (
    <Wrap>
      <IntegrationGroup
        title="Calendars"
        description="Stop double-bookings and see sessions next to the rest of your week."
      >
        <IntegrationRow
          icon="calendar_month"
          tone="blue"
          label="Google Calendar"
          description={DESC}
          actions={
            <Button disabled onClick={fn()}>
              Connect
            </Button>
          }
          footer={
            <Notice
              tone="neutral"
              icon="info"
              title="Connecting a calendar isn’t available yet."
              onDismiss={fn()}
            >
              We’re still setting this up. You’ll be able to connect Google Calendar here soon.
            </Notice>
          }
        />
      </IntegrationGroup>
    </Wrap>
  ),
};

/** Two rows, to show the divider sits between them and not on the first. */
export const TwoRows: Story = {
  render: () => (
    <Wrap>
      <IntegrationGroup title="Calendars" description="Two rows, one card.">
        <IntegrationRow
          icon="calendar_month"
          tone="blue"
          label="Google Calendar"
          description={DESC}
          status={{ tone: 'good', text: 'Connected' }}
          actions={
            <Button variant="text-destructive" onClick={fn()}>
              Disconnect
            </Button>
          }
        />
        <IntegrationRow
          icon="payments"
          tone="green"
          label="Get paid for sessions"
          badge="Coming soon"
          description="Your experience is worth paying for. Start charging for your sessions."
        />
      </IntegrationGroup>
    </Wrap>
  ),
};
