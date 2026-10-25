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

  it('a menu drawn its own way takes its classes, a danger item its own too', async () => {
    const user = userEvent.setup();
    render(
      <RowMenu
        label="Photo options"
        trigger={{ icon: 'photo_camera' }}
        menu={{ className: 'm', itemClassName: 'i', dangerClassName: 'd' }}
        items={[
          { key: 'a', icon: 'upload', label: 'Upload a new photo', onSelect: vi.fn() },
          { key: 'b', icon: 'delete', label: 'Remove photo', onSelect: vi.fn(), danger: true },
        ]}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Photo options' }));
    expect(screen.getByRole('menu')).toHaveClass('m');
    expect(screen.getByRole('menuitem', { name: /Upload/ })).toHaveClass('i');
    expect(screen.getByRole('menuitem', { name: /Upload/ })).not.toHaveClass('d');
    expect(screen.getByRole('menuitem', { name: /Remove/ })).toHaveClass('i', 'd');
  });
});

describe('RowMenu: an item that is off', () => {
  it('stays in the arrow order, says it is unavailable, and only closes the menu', async () => {
    const user = userEvent.setup();
    const dup = vi.fn();
    render(
      <RowMenu
        label="More actions"
        items={[
          { key: 'edit', icon: 'edit', label: 'Edit', onSelect: vi.fn() },
          {
            key: 'dup',
            icon: 'content_copy',
            label: 'Duplicate',
            onSelect: dup,
            disabled: true,
            reason: 'You can offer up to 5 sessions.',
          },
        ]}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'More actions' }));
    // Opening moves focus to the first item after a frame; wait for it, as above.
    await vi.waitFor(() => expect(screen.getByRole('menuitem', { name: /Edit/ })).toHaveFocus());
    await user.keyboard('{ArrowDown}');
    const item = screen.getByRole('menuitem', { name: /Duplicate/ });
    expect(item).toHaveFocus();
    expect(item).toHaveAttribute('aria-disabled', 'true');
    expect(item).toHaveAccessibleDescription('You can offer up to 5 sessions.');
    await user.keyboard('{Enter}');
    expect(dup).not.toHaveBeenCalled();
    expect(screen.queryByRole('menu')).toBeNull();
  });
});

describe('RowMenu: opens toward the room (owner, 2026-10-25)', () => {
  const WIDE = 390;
  const H = window.innerHeight;
  type Box = { left: number; top: number; width: number; height: number };
  const rect = ({ left, top, width, height }: Box) =>
    ({ left, top, width, height, right: left + width, bottom: top + height }) as DOMRect;
  // The "⋯" and the menu where CSS put it (jsdom lays nothing out).
  const place = (button: Box, menu: Box) => {
    vi.spyOn(document.documentElement, 'clientWidth', 'get').mockReturnValue(WIDE);
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: HTMLElement,
    ) {
      return rect(this.getAttribute('role') === 'menu' ? menu : button);
    });
  };
  const open = async (align?: 'start') => {
    render(
      <RowMenu
        label="Options"
        trigger={align ? { icon: 'photo_camera', align } : undefined}
        items={[{ key: 'a', icon: 'edit', label: 'Edit', onSelect: vi.fn() }]}
      />,
    );
    await userEvent.setup().click(screen.getByRole('button', { name: 'Options' }));
    return screen.getByRole('menu');
  };
  afterEach(() => vi.restoreAllMocks());

  it('a "⋯" near the left edge of a phone opens its menu to the right', async () => {
    place(
      { left: 128, top: 400, width: 32, height: 32 },
      { left: -60, top: 436, width: 220, height: 180 },
    );
    expect(await open()).toHaveAttribute('data-side', 'start');
  });

  it('with room on the left it opens as drawn, under the button’s end', async () => {
    place(
      { left: 300, top: 400, width: 32, height: 32 },
      { left: 112, top: 436, width: 220, height: 180 },
    );
    expect(await open()).not.toHaveAttribute('data-side');
  });

  it('no room on either side: it stays as drawn', async () => {
    place(
      { left: 200, top: 400, width: 32, height: 32 },
      { left: -100, top: 436, width: 332, height: 180 },
    );
    expect(await open()).not.toHaveAttribute('data-side');
  });

  it('a start-aligned menu running off the right opens toward the left', async () => {
    place(
      { left: 300, top: 400, width: 32, height: 32 },
      { left: 300, top: 436, width: 220, height: 180 },
    );
    expect(await open('start')).toHaveAttribute('data-side', 'end');
  });

  it('a start-aligned menu with room on the right stays as drawn', async () => {
    place(
      { left: 40, top: 400, width: 32, height: 32 },
      { left: 40, top: 436, width: 220, height: 180 },
    );
    expect(await open('start')).not.toHaveAttribute('data-side');
  });

  it('no room under the button (a low row on a phone): it opens above', async () => {
    place(
      { left: 128, top: H - 40, width: 32, height: 32 },
      { left: 128, top: H - 4, width: 220, height: 180 },
    );
    expect(await open()).toHaveAttribute('data-up');
  });

  it('no room above either: it opens below, as drawn', async () => {
    place(
      { left: 128, top: 100, width: 32, height: 32 },
      { left: 128, top: 136, width: 220, height: H },
    );
    expect(await open()).not.toHaveAttribute('data-up');
  });

  it('room under the button: it opens below, as drawn', async () => {
    place(
      { left: 128, top: 100, width: 32, height: 32 },
      { left: 128, top: 136, width: 220, height: 180 },
    );
    expect(await open()).not.toHaveAttribute('data-up');
  });
});
