import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Avatar } from './Avatar/Avatar';
import { Badge } from './Badge/Badge';
import { Button } from './Button/Button';
import { Chip } from './Chip/Chip';
import { Icon } from './Icon/Icon';
import { IconButton } from './IconButton/IconButton';
import { Input } from './Input/Input';
import { Skeleton } from './Skeleton/Skeleton';
import { StepBars } from './StepBars/StepBars';
import { Tabs } from './Tabs/Tabs';
import { Tag } from './Tag/Tag';

/** Every atom, every variant and state, rendered in isolation. */
const meta: Meta = { title: 'Atoms' };
export default meta;
type Story = StoryObj;

const row = { display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' } as const;
const col = { display: 'flex', flexDirection: 'column', gap: 16 } as const;

/** CTA Hierarchy.dc.html: three sizes by placement, variants by importance. */
export const Buttons: Story = {
  render: () => (
    <div style={col}>
      <div style={row}>
        <Button size="large">Book a session</Button>
        <Button size="large" variant="secondary-outlined">
          Back
        </Button>
        <Button size="large" variant="text">
          Cancel
        </Button>
      </div>
      <div style={row}>
        <Button>Book session</Button>
        <Button variant="secondary-outlined">Book</Button>
        <Button variant="text">Show 4 more reviews</Button>
        <Button variant="dark">Continue with Google</Button>
      </div>
      <div style={row}>
        <Button size="small" variant="secondary-outlined">
          Accept
        </Button>
        <Button size="small" variant="text">
          Decline
        </Button>
      </div>
      <div style={row}>
        <Button disabled>Pick a time</Button>
        <Button variant="secondary-outlined" disabled>
          Booking needs a connection
        </Button>
        <Button size="large" busy>
          Sending request…
        </Button>
      </div>
    </div>
  ),
};

export const Chips: Story = {
  render: () => (
    <div style={row}>
      <Chip pressed={false}>School selection</Chip>
      <Chip pressed>Application documents</Chip>
      <Chip pressed={false} disabled>
        Visa and interview
      </Chip>
    </div>
  ),
};

export const TagsAndIcons: Story = {
  render: () => (
    <div style={col}>
      <div style={{ ...row, background: 'var(--avatar-tone-1)', padding: 16 }}>
        <Tag tone="on-photo">Top-rated</Tag>
        <Tag tone="on-photo">Rising mentor</Tag>
      </div>
      <div style={row}>
        <Tag tone="neutral">Scholarships & funding</Tag>
        <Tag tone="topic">School selection</Tag>
        <Tag tone="info">Statement of purpose</Tag>
        <Tag tone="free">Free</Tag>
        <Icon name="star" filled label="Rated" />
        <Icon name="bolt" />
        <IconButton icon="close" aria-label="Clear search" />
      </div>
    </div>
  ),
};

export const Avatars: Story = {
  render: () => (
    <div style={row}>
      {([1, 2, 3, 4, 5, 6] as const).map((t) => (
        <Avatar key={t} tone={t} initials="OS" alt="Olajuwon Samuel" size="xl" />
      ))}
      <Avatar tone={1} initials="OS" alt="" size="sm" />
    </div>
  ),
};

export const Inputs: Story = {
  render: () => (
    <div style={{ ...col, maxWidth: 360 }}>
      <Input aria-label="Default" placeholder="Search mentors by name, school or program" />
      <Input aria-label="Invalid" invalid defaultValue="not-an-email" />
      <Input aria-label="Disabled" disabled defaultValue="Offline" />
    </div>
  ),
};

export const Loading: Story = {
  render: () => (
    <div style={{ ...col, maxWidth: 360 }}>
      <Skeleton aspectRatio="3 / 2" radius="lg" />
      <Skeleton width="60%" height="16px" />
      <StepBars total={3} current={1} label="Step 2 of 3" />
    </div>
  ),
};

export const Badges: Story = {
  render: () => (
    <div style={row}>
      <Badge color="green" type="accent" size="sm">
        New mentor
      </Badge>
      <Badge type="filled" size="sm">
        Top-rated
      </Badge>
      <Badge color="neutral" type="accent">
        Neutral
      </Badge>
    </div>
  ),
};

/** Line tabs: one tab stop; arrows, Home and End move and select. */
export const LineTabs: Story = {
  render: function Render() {
    const [tab, setTab] = useState('overview');
    return (
      <Tabs
        label="Profile"
        value={tab}
        onChange={setTab}
        items={[
          { value: 'overview', label: 'Overview', panelId: 'p-overview' },
          { value: 'sessions', label: 'Sessions (3)', panelId: 'p-sessions' },
        ]}
      />
    );
  },
};
