import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { FullNameField } from './FullNameField';

const meta: Meta = { title: 'Molecules/FullNameField' };
export default meta;
type Story = StoryObj;

function Field({
  initial = '',
  serverError,
  reveal,
}: {
  initial?: string;
  serverError?: string;
  reveal?: boolean;
}) {
  const [value, setValue] = useState(initial);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 360 }}>
      <FullNameField value={value} onChange={setValue} serverError={serverError} reveal={reveal} />
    </div>
  );
}

/** Nothing said yet: tabbing past an empty field is not a mistake. */
export const Empty: Story = { render: () => <Field /> };

export const Filled: Story = { render: () => <Field initial="Ada Okafor" /> };

/** They tried to go on with one word: the rule is said under the field. */
export const WithError: Story = { name: 'Error', render: () => <Field initial="Ada" reveal /> };

/** A refusal from the server, already in our words. */
export const ServerError: Story = {
  render: () => <Field initial="Ada Okafor" serverError="We couldn’t save that name. Try again." />,
};
