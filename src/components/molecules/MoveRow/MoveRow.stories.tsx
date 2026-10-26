import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { MoveRow } from './MoveRow';

const meta: Meta<typeof MoveRow> = { title: 'Molecules/MoveRow', component: MoveRow };
export default meta;
type Story = StoryObj;

const col = { display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 1032 } as const;

/** To do (primary and outlined actions) and done. */
export const States: Story = {
  render: () => (
    <div style={col}>
      <MoveRow
        icon="share"
        title="Share your profile"
        why="Post your link on LinkedIn or in a WhatsApp group you’re in."
        action={{ label: 'Copy link', variant: 'primary', onClick: () => {} }}
        done={false}
        doneLabel="Done this week"
      />
      <MoveRow
        icon="edit_note"
        title="Lead your About with your result"
        why="A concrete outcome, like “Fully funded PhD”, tells mentees quickly what you can help with."
        action={{ label: 'Edit About', variant: 'secondary-outlined', href: '#' }}
        done={false}
        doneLabel="Done this week"
      />
      <MoveRow
        icon="event_available"
        title="Keep at least 3 available times next week"
        why="Mentees who find you need a time they can pick."
        action={{ label: 'Add hours', variant: 'secondary-outlined', href: '#' }}
        done
        doneLabel="Done this week"
      />
    </div>
  ),
};
