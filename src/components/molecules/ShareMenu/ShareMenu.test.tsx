import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ShareMenu } from './ShareMenu';

describe('ShareMenu', () => {
  it('opens on Enter, moves with arrows, closes on Escape back to the button', async () => {
    const user = userEvent.setup();
    render(<ShareMenu url="https://edufurther.com/mentors/g" name="Gbenga E" />);
    const button = screen.getByRole('button', { name: 'Share profile' });
    button.focus();
    await user.keyboard('{Enter}');
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('menuitem', { name: 'Copy profile link' })).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(
      screen.getByRole('menuitem', { name: 'Share on LinkedIn (opens in a new tab)' }),
    ).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(button).toHaveFocus();
  });

  it('renders a labelled trigger when triggerLabel is set, which opens the same menu', async () => {
    const user = userEvent.setup();
    render(
      <ShareMenu
        url="https://edufurther.com/mentors/g"
        name="Gbenga E"
        triggerLabel="Share profile"
      />,
    );
    const button = screen.getByRole('button', { name: 'Share profile' });
    expect(button).toHaveTextContent('Share profile');
    expect(button).toHaveAttribute('aria-haspopup', 'menu');
    expect(button).toHaveAttribute('aria-expanded', 'false');
    await user.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('menuitem', { name: 'Copy profile link' })).toHaveFocus();
  });

  it('can be opened from outside and reports closing', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const { rerender } = render(
      <ShareMenu
        url="https://edufurther.com/mentors/g"
        name="Gbenga E"
        open={false}
        onOpenChange={onOpenChange}
      />,
    );
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    rerender(
      <ShareMenu
        url="https://edufurther.com/mentors/g"
        name="Gbenga E"
        open
        onOpenChange={onOpenChange}
      />,
    );
    expect(screen.getByRole('menuitem', { name: 'Copy profile link' })).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it('opened from outside: every close path reports it, and focus goes back to the opener', async () => {
    const user = userEvent.setup();
    function Page() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <ShareMenu
            url="https://edufurther.com/mentors/g"
            name="Gbenga E"
            open={open}
            onOpenChange={setOpen}
          />
          <button type="button" onClick={() => setOpen(true)}>
            Share your profile
          </button>
        </>
      );
    }
    render(<Page />);
    const opener = screen.getByRole('button', { name: 'Share your profile' });
    // Escape → back to the opener, not the header icon.
    await user.click(opener);
    expect(screen.getByRole('menuitem', { name: 'Copy profile link' })).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
    // Picking an item closes it too.
    await user.click(opener);
    await user.click(screen.getByRole('menuitem', { name: 'Share by email' }));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    // So does a click outside.
    await user.click(opener);
    await user.click(document.querySelector('[class*=backdrop]')!);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('builds share links from the encoded URL and announces a copy', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    render(<ShareMenu url="https://edufurther.com/mentors/g?x=1" name="Gbenga E" />);
    await user.click(screen.getByRole('button', { name: 'Share profile' }));
    expect(
      screen.getByRole('menuitem', { name: 'Share on LinkedIn (opens in a new tab)' }),
    ).toHaveAttribute(
      'href',
      'https://www.linkedin.com/sharing/share-offsite/?url=https%3A%2F%2Fedufurther.com%2Fmentors%2Fg%3Fx%3D1',
    );
    await user.click(screen.getByRole('menuitem', { name: 'Copy profile link' }));
    expect(writeText).toHaveBeenCalledWith('https://edufurther.com/mentors/g?x=1');
    expect(await screen.findByRole('status')).toHaveTextContent('Link copied');
  });

  it('tells its owner once a copy lands, and not when it fails', async () => {
    const user = userEvent.setup();
    const onCopied = vi.fn();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const { unmount } = render(<ShareMenu url="https://x.test/m" name="G E" onCopied={onCopied} />);
    await user.click(screen.getByRole('button', { name: 'Share profile' }));
    await user.click(screen.getByRole('menuitem', { name: 'Copy profile link' }));
    await screen.findByRole('status');
    expect(onCopied).toHaveBeenCalledTimes(1);
    unmount();

    onCopied.mockClear();
    writeText.mockRejectedValue(new Error('denied'));
    render(<ShareMenu url="https://x.test/m" name="G E" onCopied={onCopied} />);
    await user.click(screen.getByRole('button', { name: 'Share profile' }));
    await user.click(screen.getByRole('menuitem', { name: 'Copy profile link' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Couldn’t copy the link');
    expect(onCopied).not.toHaveBeenCalled();
  });

  it('says so when the clipboard API is missing (plain-http previews; review of #21)', async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
    render(<ShareMenu url="https://edufurther.com/mentors/g" name="Gbenga E" />);
    await user.click(screen.getByRole('button', { name: 'Share profile' }));
    await user.click(screen.getByRole('menuitem', { name: 'Copy profile link' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Couldn’t copy the link');
  });

  it('a note sits above the options and describes the menu, which still works', async () => {
    const user = userEvent.setup();
    render(
      <ShareMenu
        url="https://edufurther.com/mentors/g"
        name="Gbenga E"
        note="Only you can see this page."
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Share profile' }));
    const menu = screen.getByRole('menu', { name: 'Share' });
    expect(menu).toHaveAccessibleDescription('Only you can see this page.');
    // Not one of the menu's items: only actions are.
    expect(menu).not.toHaveTextContent('Only you can see this page.');
    expect(screen.getByRole('menuitem', { name: 'Copy profile link' })).toHaveFocus();
  });

  it('clicking the note keeps focus in the menu, so the keys still work', async () => {
    const user = userEvent.setup();
    render(<ShareMenu url="https://edufurther.com/mentors/g" name="Gbenga E" note="Only you." />);
    await user.click(screen.getByRole('button', { name: 'Share profile' }));
    await user.click(screen.getByText('Only you.'));
    expect(screen.getByRole('menuitem', { name: 'Copy profile link' })).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('slides the panel back on screen, under its own button (audit: clipped on phones)', async () => {
    const user = userEvent.setup();
    const rect = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      left: -65,
      right: 195,
      top: 0,
      bottom: 0,
      width: 260,
      height: 0,
    } as DOMRect);
    render(<ShareMenu url="https://x.test/m" name="G E" />);
    await user.click(screen.getByRole('button', { name: 'Share profile' }));
    // 16px inside the screen: slid right by 81px.
    expect(screen.getByRole('menu').parentElement).toHaveStyle({ transform: 'translateX(81px)' });
    rect.mockRestore();
  });
});
