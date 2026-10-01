import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// The full-load fallback, observable without leaving jsdom.
const fullNavigate = vi.fn();
vi.mock('@/lib/utils/hardNavigate', () => ({
  fullNavigate: (href: string) => fullNavigate(href),
  hardNavigate: vi.fn(),
}));

// A fresh guard registry per test: module state must not carry over (a
// discard in one test would make the next one pass for the wrong reason).
let AppShell: typeof import('./AppShell').AppShell;
let useLeaveGuard: typeof import('@/lib/utils/leaveGuard').useLeaveGuard;
const followed = vi.fn();
beforeEach(async () => {
  vi.resetModules();
  ({ AppShell } = await import('./AppShell'));
  ({ useLeaveGuard } = await import('@/lib/utils/leaveGuard'));
  fullNavigate.mockReset();
  followed.mockReset();
});

function Form({ dirty }: { dirty: boolean }) {
  useLeaveGuard(dirty, 'your About section');
  return null;
}
function Page({ dirty }: { dirty: boolean }) {
  return (
    <AppShell active="Home" nav="mentor" chrome="member" offline={false}>
      <Form dirty={dirty} />
      <a
        href="/bookings"
        onClick={(e) => {
          e.preventDefault();
          followed();
        }}
      >
        Go on
      </a>
    </AppShell>
  );
}
const dialog = () => screen.queryByRole('dialog', { name: 'Discard your changes?' });
const goOn = () => screen.getByRole('link', { name: 'Go on' });

describe('in-app links while a form has unsaved changes', () => {
  it('asks first; "Keep editing" stays on the page', async () => {
    render(<Page dirty />);
    await userEvent.click(goOn());
    expect(dialog()).toHaveTextContent('Your changes to your About section won’t be saved.');
    expect(followed).not.toHaveBeenCalled();
    await userEvent.click(within(dialog()!).getByRole('button', { name: 'Keep editing' }));
    expect(dialog()).toBeNull();
    expect(followed).not.toHaveBeenCalled();
  });

  it('"Discard" follows the link the user clicked', async () => {
    render(<Page dirty />);
    await userEvent.click(goOn());
    await userEvent.click(screen.getByRole('button', { name: 'Discard' }));
    expect(dialog()).toBeNull();
    expect(followed).toHaveBeenCalledTimes(1);
  });

  it('Enter on a focused link asks too', async () => {
    render(<Page dirty />);
    goOn().focus();
    await userEvent.keyboard('{Enter}');
    expect(dialog()).not.toBeNull();
    expect(followed).not.toHaveBeenCalled();
  });

  it('nothing unsaved: links work as usual, no dialog', async () => {
    render(<Page dirty={false} />);
    await userEvent.click(goOn());
    expect(dialog()).toBeNull();
    expect(followed).toHaveBeenCalledTimes(1);
  });

  it('a ctrl/⌘-click (new tab) isn’t held, though a plain click on the same link is', async () => {
    render(<Page dirty />);
    const user = userEvent.setup();
    await user.click(goOn());
    expect(dialog()).not.toBeNull();
    await user.click(within(dialog()!).getByRole('button', { name: 'Keep editing' }));
    await user.keyboard('{Control>}');
    await user.click(goOn());
    await user.keyboard('{/Control}');
    expect(dialog()).toBeNull();
    expect(followed).toHaveBeenCalledTimes(1);
  });

  it('the link is gone by the time of "Discard": a full load of it instead', async () => {
    render(<Page dirty />);
    await userEvent.click(goOn());
    const a = goOn();
    act(() => a.remove());
    await userEvent.click(screen.getByRole('button', { name: 'Discard' }));
    expect(fullNavigate).toHaveBeenCalledWith(`${window.location.origin}/bookings`);
  });
});

describe('the More sheet (phones) under the dialog', () => {
  it('Escape closes the dialog only; the sheet stays, as after "Keep editing"', async () => {
    render(
      <AppShell
        active="Home"
        nav="mentor"
        chrome="member"
        offline={false}
        account={{ avatar: { initial: 'G', cover: 'sky' }, items: [] }}
      >
        <Form dirty />
      </AppShell>,
    );
    const user = userEvent.setup();
    const tabs = screen.getAllByRole('navigation', { name: 'Main' })[1]!;
    await user.click(within(tabs).getByRole('button', { name: 'More' }));
    const sheet = document.getElementById('more-sheet')!;
    await user.click(within(sheet).getByRole('link', { name: /Settings/ }));
    expect(dialog()).not.toBeNull();
    await user.keyboard('{Escape}');
    expect(dialog()).toBeNull();
    expect(document.getElementById('more-sheet')).not.toBeNull();
  });
});
