import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { SessionIcon } from '@/types/sessionType';
import { IconPicker } from './IconPicker';

function Harness() {
  const [v, setV] = useState<SessionIcon | null>(null);
  return <IconPicker value={v} auto="edit_document" onChange={setV} />;
}

describe('IconPicker', () => {
  it('opens on the checked option; arrows pick; Escape closes and returns focus', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const tile = screen.getByRole('button', { name: 'Change session icon' });
    await user.click(tile);
    expect(tile).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('radio', { name: 'Automatic, based on topics' })).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: 'Video call' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(tile).toHaveFocus();
  });

  it('clicking an icon picks it and closes', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Change session icon' }));
    await user.click(screen.getByRole('radio', { name: 'Advice' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Change session icon' }));
    expect(screen.getByRole('radio', { name: 'Advice' })).toHaveAttribute('aria-checked', 'true');
  });
});
