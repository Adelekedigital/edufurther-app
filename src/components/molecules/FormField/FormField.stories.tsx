import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { FormField } from './FormField';
import { Input, Textarea } from '@/components/atoms/Input/Input';

const meta: Meta<typeof FormField> = { title: 'Molecules/FormField', component: FormField };
export default meta;
type Story = StoryObj;

export const Fields: Story = {
  render: function Render() {
    const [desc, setDesc] = useState('');
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 560 }}>
        <FormField
          label="Session name"
          hint="Be specific. Mentees scan this when comparing sessions."
        >
          {(f) => <Input {...f} fieldSize="md" placeholder="e.g. SOP draft review" />}
        </FormField>
        <FormField
          label="What mentees get"
          counter={`${desc.length} / 500`}
          hint="Say what they’ll leave with. Aim for 3–5 sentences."
        >
          {(f) => (
            <Textarea
              {...f}
              rows={4}
              maxLength={500}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
            />
          )}
        </FormField>
        <FormField
          label="Session name"
          error="Give your session a name."
          hint="Be specific. Mentees scan this when comparing sessions."
        >
          {(f) => <Input {...f} fieldSize="md" />}
        </FormField>
      </div>
    );
  },
};

/** Session Types topics (DS choice chips): at three, the rest are disabled. */
