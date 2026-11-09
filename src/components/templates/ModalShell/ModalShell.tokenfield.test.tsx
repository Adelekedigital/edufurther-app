import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { TokenField } from '@/components/molecules/TokenField/TokenField';
import { ModalShell } from './ModalShell';

// TokenField inside a dialog: Escape closes only its value list (stopEscape).

function Field() {
  const [v, setV] = useState('');
  return (
    <TokenField
      id="subject"
      ariaLabel="Subject"
      value={v}
      onChange={setV}
      values={[{ name: 'mentorName' }]}
    />
  );
}

it('TokenField in a dialog: Escape closes the list, not the dialog; the next Escape closes it', async () => {
  const user = userEvent.setup();
  const onClose = vi.fn();
  render(
    <ModalShell title="Edit" onClose={onClose}>
      <Field />
    </ModalShell>,
  );
  await user.type(screen.getByRole('textbox', { name: 'Subject' }), '/');
  expect(screen.getByRole('listbox')).toBeInTheDocument();
  await user.keyboard('{Escape}');
  expect(screen.queryByRole('listbox')).toBeNull();
  expect(onClose).not.toHaveBeenCalled();
  await user.keyboard('{Escape}');
  expect(onClose).toHaveBeenCalled();
});
