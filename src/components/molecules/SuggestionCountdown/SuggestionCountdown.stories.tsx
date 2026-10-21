import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { SuggestionCountdown } from './SuggestionCountdown';

const meta: Meta<typeof SuggestionCountdown> = {
  title: 'Molecules/SuggestionCountdown',
  component: SuggestionCountdown,
};
export default meta;
type Story = StoryObj;

const HOLD_NOW = new Date('2026-10-05T12:00:00Z');
const heldIn = (minutes: number) => new Date(HOLD_NOW.getTime() + minutes * 60_000).toISOString();

/**
 * Ours: how long an offered time stays held for the mentee. The design has no
 * mentee-side view of a suggested time, so the pill is drawn to DeadlinePill's
 * spec — two countdowns on one screen should not read as two controls.
 *
 * Hours and minutes above the hour, minutes alone below it, words in the last
 * minute, and the hold's end rather than "0m". Warm under ten minutes.
 */
export const HoldCountdown: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <SuggestionCountdown heldUntil={heldIn(120)} now={HOLD_NOW} />
      <SuggestionCountdown heldUntil={heldIn(118)} now={HOLD_NOW} />
      <SuggestionCountdown heldUntil={heldIn(58)} now={HOLD_NOW} />
      <SuggestionCountdown heldUntil={heldIn(4)} now={HOLD_NOW} />
      <SuggestionCountdown heldUntil={heldIn(0.5)} now={HOLD_NOW} />
      <SuggestionCountdown heldUntil={heldIn(0)} now={HOLD_NOW} />
      <SuggestionCountdown heldUntil={heldIn(-90)} now={HOLD_NOW} />
      {/* No clock handed in: this one counts itself down. */}
      <SuggestionCountdown heldUntil={new Date(Date.now() + 4.4 * 60_000).toISOString()} />
    </div>
  ),
};

/** The recommended provider card: chosen, unchosen, and the read-only one. */
