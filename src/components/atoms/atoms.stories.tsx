import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Avatar } from './Avatar/Avatar';
import { Badge } from './Badge/Badge';
import { Button } from './Button/Button';
import { Chip } from './Chip/Chip';
import { Icon } from './Icon/Icon';
import { Star } from './Star/Star';
import { IconButton } from './IconButton/IconButton';
import { Input } from './Input/Input';
import { Radio } from './Radio/Radio';
import { Select } from './Select/Select';
import { Switch } from './Switch/Switch';
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
        <Tag tone="on-photo">New mentor</Tag>
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

/** Mentor Profile.dc.html rating stars: the design's star.svg at its four sizes. */
export const Stars: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center', color: 'var(--rating-star)' }}>
      <Star size={10} />
      <Star size={12} />
      <Star size={14} />
      <Star size={16} />
      <span style={{ color: 'var(--ink-200)' }}>
        <Star size={16} />
      </span>
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

/** DS FormControl toggle, size 20 (Session Types list: Live / Hidden). */
export const Switches: Story = {
  render: function Render() {
    const [on, setOn] = useState(true);
    return (
      <div style={row}>
        <Switch checked={on} onChange={setOn} aria-label="SOP draft review is live" />
        <Switch checked={false} onChange={() => {}} aria-label="Off" />
        <Switch checked onChange={() => {}} aria-label="Disabled on" disabled />
      </div>
    );
  },
};

/** DS FormControl radio, size 20. */
export const Radios: Story = {
  render: function Render() {
    const [v, setV] = useState('a');
    return (
      <div style={row}>
        {['a', 'b'].map((x) => (
          <label key={x} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Radio name="demo" checked={v === x} onChange={() => setV(x)} />
            Option {x.toUpperCase()}
          </label>
        ))}
        <Radio aria-label="Disabled" disabled />
      </div>
    );
  },
};

/** Session Types rule rows (160px) and overrides (240px). */
export const Selects: Story = {
  render: () => (
    <div style={row}>
      <Select
        aria-label="Session length"
        width={160}
        defaultValue="60"
        options={[30, 45, 60, 90].map((m) => ({ value: String(m), label: `${m} min` }))}
      />
      <Select
        aria-label="Booking approval"
        width={240}
        options={[
          { value: 'inherit', label: 'Use my default' },
          { value: 'on', label: 'Approve each request' },
        ]}
      />
      <Select
        aria-label="Disabled"
        width={160}
        disabled
        options={[{ value: 'x', label: 'Disabled' }]}
      />
    </div>
  ),
};

/** Danger modal confirm (CTA Hierarchy: destructive filled, only inside the confirm). */
export const DestructiveButton: Story = {
  render: () => (
    <div style={row}>
      <Button size="large" variant="destructive">
        Delete
      </Button>
      <Button size="large" variant="destructive" busy>
        Deleting…
      </Button>
      <Button size="large" variant="destructive" disabled>
        Delete
      </Button>
    </div>
  ),
};

/** Session Types row actions: 32px rounded square; delete hovers red. */
export const RowIconButtons: Story = {
  render: () => (
    <div style={row}>
      <IconButton icon="edit" size="sm" shape="square" aria-label="Edit question 1" />
      <IconButton
        icon="delete"
        size="sm"
        shape="square"
        tone="danger"
        aria-label="Delete SOP draft review"
      />
    </div>
  ),
};
