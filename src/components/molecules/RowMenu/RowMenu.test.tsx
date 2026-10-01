import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RowMenu, type RowMenuItem } from './RowMenu';

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

  describe('an item that goes away while the menu is open (issue 114)', () => {
    const item = (key: string, label: string): RowMenuItem => ({
      key,
      icon: 'edit',
      label,
      onSelect: vi.fn(),
    });
    const edit = item('edit', 'Edit');
    const feature = item('feature', 'Mark as featured');
    const del = item('del', 'Delete');
    const menuOf = (items: RowMenuItem[]) => <RowMenu label="More actions for SOP" items={items} />;

    it('the focused one: focus moves to the item now in its place, and the keys still work', async () => {
      const user = userEvent.setup();
      const { rerender } = render(menuOf([edit, feature, del]));
      screen.getByRole('button', { name: 'More actions for SOP' }).focus();
      await user.keyboard('{Enter}');
      await vi.waitFor(() => expect(screen.getByRole('menuitem', { name: 'Edit' })).toHaveFocus());
      await user.keyboard('{ArrowDown}');
      expect(screen.getByRole('menuitem', { name: 'Mark as featured' })).toHaveFocus();
      rerender(menuOf([edit, del]));
      expect(screen.getByRole('menuitem', { name: 'Delete' })).toHaveFocus();
      await user.keyboard('{ArrowUp}');
      expect(screen.getByRole('menuitem', { name: 'Edit' })).toHaveFocus();
      await user.keyboard('{Escape}');
      expect(screen.queryByRole('menu')).toBeNull();
      expect(screen.getByRole('button', { name: 'More actions for SOP' })).toHaveFocus();
    });

    it('the focused last one: focus moves to the new last item', async () => {
      const user = userEvent.setup();
      const { rerender } = render(menuOf([edit, feature, del]));
      screen.getByRole('button', { name: 'More actions for SOP' }).focus();
      await user.keyboard('{ArrowUp}');
      await vi.waitFor(() =>
        expect(screen.getByRole('menuitem', { name: 'Delete' })).toHaveFocus(),
      );
      rerender(menuOf([edit, feature]));
      expect(screen.getByRole('menuitem', { name: 'Mark as featured' })).toHaveFocus();
    });

    it('every one: the menu closes and focus goes back to the button', async () => {
      const user = userEvent.setup();
      const { rerender } = render(menuOf([feature]));
      screen.getByRole('button', { name: 'More actions for SOP' }).focus();
      await user.keyboard('{Enter}');
      await vi.waitFor(() =>
        expect(screen.getByRole('menuitem', { name: 'Mark as featured' })).toHaveFocus(),
      );
      rerender(menuOf([]));
      expect(screen.queryByRole('menu')).toBeNull();
      expect(screen.getByRole('button', { name: 'More actions for SOP' })).toHaveFocus();
    });

    it('one that moved since it was focused: focus goes to the item now in its place', async () => {
      const user = userEvent.setup();
      const dup = item('dup', 'Duplicate');
      const { rerender } = render(menuOf([edit, feature, del]));
      screen.getByRole('button', { name: 'More actions for SOP' }).focus();
      await user.keyboard('{Enter}');
      await vi.waitFor(() => expect(screen.getByRole('menuitem', { name: 'Edit' })).toHaveFocus());
      await user.keyboard('{ArrowDown}'); // Mark as featured, second
      rerender(menuOf([dup, edit, feature, del])); // now third, still focused
      expect(screen.getByRole('menuitem', { name: 'Mark as featured' })).toHaveFocus();
      rerender(menuOf([dup, edit, del]));
      expect(screen.getByRole('menuitem', { name: 'Delete' })).toHaveFocus();
    });

    it('another one: focus stays where it is', async () => {
      const user = userEvent.setup();
      const { rerender } = render(menuOf([edit, feature, del]));
      screen.getByRole('button', { name: 'More actions for SOP' }).focus();
      await user.keyboard('{ArrowUp}');
      await vi.waitFor(() =>
        expect(screen.getByRole('menuitem', { name: 'Delete' })).toHaveFocus(),
      );
      rerender(menuOf([edit, del]));
      expect(screen.getByRole('menuitem', { name: 'Delete' })).toHaveFocus();
    });
  });

  it('a click outside on the page closes it without pulling focus back to the button', async () => {
    const user = userEvent.setup();
    render(
      <>
        <RowMenu
          label="More actions for SOP"
          items={[{ key: 'edit', icon: 'edit', label: 'Edit', onSelect: vi.fn() }]}
        />
        <p>Some text</p>
      </>,
    );
    const trigger = screen.getByRole('button', { name: 'More actions for SOP' });
    trigger.focus();
    await user.keyboard('{Enter}');
    await vi.waitFor(() => expect(screen.getByRole('menuitem', { name: 'Edit' })).toHaveFocus());
    await user.click(screen.getByText('Some text'));
    expect(screen.queryByRole('menu')).toBeNull();
    expect(trigger).not.toHaveFocus();
  });

  it('a click outside closes it', async () => {
    const user = userEvent.setup();
    const { trigger } = setup();
    await user.click(trigger);
    expect(screen.getByRole('menu')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Outside' }));
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('a custom trigger: its icon and class, named by `label`, behaving the same', async () => {
    const pick = vi.fn();
    const user = userEvent.setup();
    render(
      <RowMenu
        label="Change or remove photo"
        trigger={{ icon: 'photo_camera', size: 14, className: 'badge' }}
        items={[{ key: 'a', icon: 'edit', label: 'Change photo', onSelect: pick }]}
      />,
    );
    const trigger = screen.getByRole('button', { name: 'Change or remove photo' });
    expect(trigger).toHaveClass('badge');
    expect(trigger).toHaveTextContent('photo_camera');
    await user.click(trigger);
    await user.click(screen.getByRole('menuitem', { name: /Change photo/ }));
    expect(pick).toHaveBeenCalled();
  });

  it('an inert trigger says so and doesn’t open', async () => {
    const user = userEvent.setup();
    render(
      <RowMenu
        label="Change or remove photo"
        trigger={{ icon: 'photo_camera', disabled: true }}
        items={[{ key: 'a', icon: 'edit', label: 'Change photo', onSelect: vi.fn() }]}
      />,
    );
    const trigger = screen.getByRole('button', { name: 'Change or remove photo' });
    expect(trigger).toHaveAttribute('aria-disabled', 'true');
    await user.click(trigger);
    trigger.focus();
    await user.keyboard('{ArrowDown}');
    expect(screen.queryByRole('menu')).toBeNull();
  });
});
