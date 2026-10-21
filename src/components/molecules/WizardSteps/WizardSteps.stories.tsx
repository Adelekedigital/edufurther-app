import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { WizardSteps } from './WizardSteps';

const meta: Meta<typeof WizardSteps> = { title: 'Molecules/WizardSteps', component: WizardSteps };
export default meta;
type Story = StoryObj;

const WIZARD = [
  'Define your session',
  'Prepare for session',
  'Set booking rules',
  'Review and publish',
];
/** Create: on step 2 of a fresh flow — 3 and 4 locked. */

export const Steps: Story = {
  render: function Render() {
    const [cur, setCur] = useState(2);
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 880 }}>
        <WizardSteps
          label="Create a session"
          steps={WIZARD}
          current={cur}
          reached={2}
          onSelect={setCur}
        />
        <WizardSteps label="Edit session" steps={WIZARD} current={4} reached={4} onSelect={fn()} />
        <WizardSteps
          label="Revisiting step 1"
          steps={WIZARD}
          current={1}
          reached={3}
          onSelect={fn()}
        />
      </div>
    );
  },
};
