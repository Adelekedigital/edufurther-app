import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RowMenu } from './RowMenu';

const setup = () => {
  const edit = vi.fn();
  const del = vi.fn();
  render(
    <>
      <RowMenu
        label="More actions for SOP"
        items={[
          { key: 'edit', icon: 'edit', label: 'Edit', onSelect: edit },
          { key: 'dup', icon: 'content_copy', label: 'Duplicate', onSelect: vi.fn() },
          { key: 'del', icon: 'delete', label: 'Delete', onSelect: del, danger: true },
        ]}
      />
      <button type="button">Outside</button>
    </>,
  );
  return { edit, del, trigger: screen.getByRole('button', { name: 'More actions for SOP' }) };
};

describe('RowMenu (WAI-ARIA menu button)', () => {
  it('opens on the first item; arrows, Home and End move; Escape returns to the button', async () => {
    const user = userEvent.setup();
    const { trigger } = setup();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    trigger.focus();
    await user.keyboard('{Enter}');
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await vi.waitFor(() => expect(screen.getByRole('menuitem', { name: /Edit/ })).toHaveFocus());
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: /Duplicate/ })).toHaveFocus();
    await user.keyboard('{End}');
    expect(screen.getByRole('menuitem', { name: /Delete/ })).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: /Edit/ })).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).toBeNull();
    expect(trigger).toHaveFocus();
  });

  it('ArrowUp opens on the last item; choosing one runs it and closes', async () => {
    const user = userEvent.setup();
    const { trigger, del } = setup();
    trigger.focus();
    await user.keyboard('{ArrowUp}');
    await vi.waitFor(() => expect(screen.getByRole('menuitem', { name: /Delete/ })).toHaveFocus());
    await user.keyboard('{Enter}');
    expect(del).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('a click outside closes it', async () => {
    const user = userEvent.setup();
    const { trigger } = setup();
    await user.click(trigger);
    expect(screen.getByRole('menu')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Outside' }));
    expect(screen.queryByRole('menu')).toBeNull();
  });
});
