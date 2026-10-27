import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { AddCreditsConfirm } from './AddCreditsConfirm';
import { CreditLog } from './CreditLog';
import { CreditRules } from './CreditRules';
import { FindMenteeCard } from './FindMenteeCard';
import { MenteeHeader, PanelBody, type PanelBodyProps } from './MenteeCreditsPanel';
import { AMARA, CHIAMAKA, ENTRIES, LONG_NAME, NO_MORE } from './fixtures';

/** The admin Credits sections (Admin.dc.html creditLayout lookup), each across its states. */
const meta: Meta = { title: 'Screens/Admin Credits' };
export default meta;
type Story = StoryObj;

const col = { display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 720 } as const;
const find = {
  query: '',
  onQuery: fn(),
  term: '',
  onRetry: fn(),
  pickedId: null,
  onPick: fn(),
};

export const FindMentee: Story = {
  render: () => (
    <div style={col}>
      <FindMenteeCard {...find} status="ready" mentees={[AMARA, CHIAMAKA, LONG_NAME]} />
      <FindMenteeCard
        {...find}
        status="ready"
        mentees={[AMARA]}
        pickedId={AMARA.id}
        query="ama"
        term="ama"
        narrow
      />
      <FindMenteeCard {...find} status="ready" mentees={[]} query="ibrahim" term="ibrahim" />
      <FindMenteeCard {...find} status="loading" mentees={[]} />
      <FindMenteeCard {...find} status="error" mentees={[]} />
    </div>
  ),
};

function Panel(p: Partial<PanelBodyProps>) {
  const [amount, setAmount] = useState(1);
  const [reason, setReason] = useState('');
  const mentee = p.mentee === undefined ? AMARA : p.mentee;
  return (
    <section
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
        padding: 24,
        border: '1px solid var(--ink-200)',
        borderRadius: 'var(--radius-xl)',
      }}
    >
      <MenteeHeader name={mentee?.name ?? 'Amara Okafor'} mentee={mentee} />
      <PanelBody
        mentee={mentee}
        history={ENTRIES}
        status="ready"
        onRetry={fn()}
        timeZone="Africa/Lagos"
        amount={amount}
        onAmount={setAmount}
        reason={reason}
        onReason={setReason}
        onAdd={fn()}
        more={NO_MORE}
        {...p}
      />
    </section>
  );
}

export const MenteePanel: Story = {
  render: () => (
    <div style={col}>
      <Panel />
      <Panel mentee={LONG_NAME} more={{ ...NO_MORE, hasMore: true }} />
      <Panel mentee={CHIAMAKA} history={[]} />
      <Panel mentee={null} status="loading" />
      <Panel mentee={null} status="error" />
    </div>
  ),
};

export const Confirm: Story = {
  render: () => (
    <AddCreditsConfirm mentee={AMARA} amount={2} pending={false} onCancel={fn()} onConfirm={fn()} />
  ),
};

const log = {
  type: 'all' as const,
  onType: fn(),
  onRetry: fn(),
  timeZone: 'Africa/Lagos',
  onOpen: fn(),
  more: NO_MORE,
};

export const Log: Story = {
  render: () => (
    <div style={{ ...col, maxWidth: 1080 }}>
      <CreditLog {...log} status="ready" entries={ENTRIES} more={{ ...NO_MORE, hasMore: true }} />
      <CreditLog {...log} status="ready" entries={[]} />
      <CreditLog {...log} status="loading" entries={[]} />
      <CreditLog {...log} status="error" entries={[]} />
    </div>
  ),
};

export const Rules: Story = {
  render: () => (
    <div style={col}>
      <CreditRules rules={{ starter: 1, monthly: 3 }} status="ready" onRetry={fn()} />
      <CreditRules rules={null} status="loading" onRetry={fn()} />
      <CreditRules rules={null} status="error" onRetry={fn()} />
    </div>
  ),
};
