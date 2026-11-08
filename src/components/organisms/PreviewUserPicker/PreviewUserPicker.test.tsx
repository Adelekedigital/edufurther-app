import { useState, type ComponentProps } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { PreviewUser } from '@/lib/api/data/previewStore';
import { PreviewUserPicker, type PickerRole } from './PreviewUserPicker';

const user = (i: number, over: Partial<PreviewUser> = {}): PreviewUser => ({
  id: `u-${i}`,
  email: `person${i}@example.com`,
  name: `Person ${i}`,
  firstName: `Person`,
  initials: 'P',
  role: i % 2 ? 'mentor' : 'mentee',
  ...over,
});
const three = [user(0), user(1), user(2)];

type Props = ComponentProps<typeof PreviewUserPicker>;
const more = (o: Partial<Props['more']> = {}): Props['more'] => ({
  hasMore: false,
  loadingMore: false,
  loadMoreFailed: false,
  loadMore: vi.fn(),
  ...o,
});

function setup(over: Partial<Props> = {}) {
  const props: Props = {
    id: 'picker',
    query: '',
    onQuery: vi.fn(),
    role: 'all',
    onRole: vi.fn(),
    users: three,
    status: 'ready',
    onRetry: vi.fn(),
    currentId: null,
    miss: null,
    startFailed: false,
    onPick: vi.fn(),
    more: more(),
    onClose: vi.fn(),
    ...over,
  };
  const view = render(<PreviewUserPicker {...props} />);
  const search = within(view.container).getByRole('combobox', {
    name: 'Search users by email or name',
  });
  return { props, view, search };
}

describe('PreviewUserPicker: the combobox', () => {
  it('the search field is focused and controls the listbox', () => {
    const { search } = setup();
    expect(search).toHaveFocus();
    const list = screen.getByRole('listbox', { name: 'Users' });
    expect(search).toHaveAttribute('aria-controls', list.id);
    expect(search).toHaveAttribute('aria-expanded', 'true');
    expect(search).not.toHaveAttribute('aria-activedescendant');
    expect(within(list).getAllByRole('option')).toHaveLength(3);
  });

  it('arrows move the active row (aria-activedescendant), clamped at both ends', async () => {
    const { search } = setup();
    const options = screen.getAllByRole('option');
    await userEvent.keyboard('{ArrowDown}');
    expect(search).toHaveAttribute('aria-activedescendant', options[0]!.id);
    await userEvent.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}');
    expect(search).toHaveAttribute('aria-activedescendant', options[2]!.id);
    await userEvent.keyboard('{ArrowUp}{ArrowUp}{ArrowUp}');
    expect(search).toHaveAttribute('aria-activedescendant', options[0]!.id);
  });

  it('Enter picks the active row; with none active it does nothing', async () => {
    const { props } = setup();
    await userEvent.keyboard('{Enter}');
    expect(props.onPick).not.toHaveBeenCalled();
    await userEvent.keyboard('{ArrowDown}{ArrowDown}{Enter}');
    expect(props.onPick).toHaveBeenCalledWith(three[1]);
  });

  it('Escape closes', async () => {
    const { props } = setup();
    await userEvent.keyboard('{Escape}');
    expect(props.onClose).toHaveBeenCalledOnce();
  });

  it('a new answer starts the keyboard from the top', async () => {
    const { search, view, props } = setup();
    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    view.rerender(<PreviewUserPicker {...props} users={[user(5), user(6)]} />);
    expect(search).not.toHaveAttribute('aria-activedescendant');
  });

  it('a page added on scroll keeps the row the keyboard is on, and Enter still picks it', async () => {
    const { search, view, props } = setup();
    await userEvent.keyboard('{ArrowDown}{ArrowDown}');
    const on = search.getAttribute('aria-activedescendant');
    expect(on).toBeTruthy();
    view.rerender(<PreviewUserPicker {...props} users={[...props.users, user(8), user(9)]} />);
    expect(search).toHaveAttribute('aria-activedescendant', on!);
    await userEvent.keyboard('{Enter}');
    expect(props.onPick).toHaveBeenCalledWith(props.users[1]);
  });

  it('typing reports the query', async () => {
    function Controlled() {
      const [q, setQ] = useState('');
      return (
        <PreviewUserPicker
          id="p"
          query={q}
          onQuery={setQ}
          role="all"
          onRole={vi.fn()}
          users={[]}
          status="ready"
          onRetry={vi.fn()}
          currentId={null}
          miss={null}
          startFailed={false}
          onPick={vi.fn()}
          more={more()}
          onClose={vi.fn()}
        />
      );
    }
    render(<Controlled />);
    await userEvent.keyboard('zz');
    expect(screen.getByRole('combobox')).toHaveValue('zz');
    // Shown under the list, and said once by the always-mounted live region.
    expect(screen.getByRole('status')).toHaveTextContent('No users match “zz”.');
    expect(screen.getAllByText('No users match “zz”.')).toHaveLength(2);
  });

  it('a modal dialog: focus starts in the search, Escape closes from anywhere in it', async () => {
    const { props } = setup({ status: 'error', users: [] });
    expect(screen.getByRole('dialog', { name: 'Choose a user to preview as' })).toHaveAttribute(
      'aria-modal',
      'true',
    );
    expect(screen.getByRole('combobox')).toHaveFocus();
    // Escape away from the search (the Tab wrap is the shared useFocusTrap's,
    // tested there and in the browser: jsdom has no layout for its visibility check).
    screen.getByRole('button', { name: 'Try again' }).focus();
    await userEvent.keyboard('{Escape}');
    expect(props.onClose).toHaveBeenCalledOnce();
  });

  it('the current person is selected, with a check', () => {
    setup({ currentId: 'u-1' });
    const options = screen.getAllByRole('option');
    expect(options[1]).toHaveAttribute('aria-selected', 'true');
    expect(options[0]).toHaveAttribute('aria-selected', 'false');
  });

  it('a click on the scrim closes', async () => {
    const { props, view } = setup();
    await userEvent.click(view.container.querySelector('[aria-hidden]')!);
    expect(props.onClose).toHaveBeenCalled();
  });
});

describe('PreviewUserPicker: role filter (the shared RadioChips row)', () => {
  it('All, Mentors, Mentees: a radiogroup with the current one checked; a click reports it', async () => {
    const { props } = setup({ role: 'mentor' });
    const group = screen.getByRole('radiogroup', { name: 'Filter by role' });
    expect(within(group).getAllByRole('radio')).toHaveLength(3);
    expect(within(group).getByRole('radio', { name: /Mentors/ })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect(within(group).getByRole('radio', { name: /All/ })).toHaveAttribute(
      'aria-checked',
      'false',
    );
    await userEvent.click(within(group).getByRole('radio', { name: /Mentees/ }));
    expect(props.onRole).toHaveBeenCalledWith('mentee' satisfies PickerRole);
  });

  it('arrow keys move the choice', async () => {
    const { props } = setup({ role: 'all' });
    const all = screen.getByRole('radio', { name: /All/ });
    all.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(props.onRole).toHaveBeenLastCalledWith('mentor');
  });
});

describe('PreviewUserPicker: states', () => {
  it('loading: the live region says "Loading users", the list is busy, no rows', () => {
    setup({ status: 'loading', users: [] });
    expect(screen.getByRole('status')).toHaveTextContent('Loading users');
    expect(screen.getByRole('listbox').parentElement).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryAllByRole('option')).toHaveLength(0);
    // The listbox stays: the combobox's aria-controls still names it.
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('error: "We couldn’t load users." and Try again retries', async () => {
    const { props } = setup({ status: 'error', users: three });
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('We couldn’t load users.');
    expect(screen.queryAllByRole('option')).toHaveLength(0);
    await userEvent.click(within(alert).getByRole('button', { name: 'Try again' }));
    expect(props.onRetry).toHaveBeenCalledOnce();
  });

  it('no match: names the trimmed query', () => {
    setup({ users: [], query: '  ghost  ' });
    expect(screen.getByRole('status')).toHaveTextContent('No users match “ghost”.');
  });

  it('a ?viewAs= miss: the red note above the list', () => {
    setup({ miss: 'ghost@example.com' });
    expect(screen.getByRole('alert')).toHaveTextContent(
      'No user matches “ghost@example.com”. Pick someone below.',
    );
  });

  it('a pick that failed to open: the provisional note', () => {
    setup({ startFailed: true });
    expect(screen.getByRole('alert')).toHaveTextContent(
      'We couldn’t open that preview. Try again.',
    );
  });

  it('loading more: the live region says so, the rows stay', () => {
    setup({ more: more({ hasMore: true, loadingMore: true }) });
    expect(screen.getByRole('status')).toHaveTextContent('Loading more users');
    expect(screen.getAllByRole('option')).toHaveLength(3);
  });

  it('loading more failed: its Try again asks for the page again', async () => {
    const m = more({ hasMore: true, loadMoreFailed: true });
    setup({ more: m });
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('We couldn’t load more users.');
    await userEvent.click(within(alert).getByRole('button', { name: 'Try again' }));
    expect(m.loadMore).toHaveBeenCalledOnce();
  });
});

describe('PreviewUserPicker: more on scroll (IntersectionObserver)', () => {
  type Cb = (e: { isIntersecting: boolean }[]) => void;
  let observers: { cb: Cb; disconnect: ReturnType<typeof vi.fn> }[];
  beforeEach(() => {
    observers = [];
    vi.stubGlobal(
      'IntersectionObserver',
      class {
        cb: Cb;
        disconnect = vi.fn();
        constructor(cb: Cb) {
          this.cb = cb;
          observers.push(this);
        }
        observe() {}
      },
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  it('the list’s end coming into view asks for the next page', () => {
    const m = more({ hasMore: true });
    setup({ more: m });
    expect(observers).toHaveLength(1);
    observers[0]!.cb([{ isIntersecting: false }]);
    expect(m.loadMore).not.toHaveBeenCalled();
    observers[0]!.cb([{ isIntersecting: true }]);
    expect(m.loadMore).toHaveBeenCalledOnce();
  });

  it('nothing watched with no more pages, while loading, or after a failure', () => {
    setup({ more: more({ hasMore: false }) });
    setup({ more: more({ hasMore: true, loadingMore: true }) });
    setup({ more: more({ hasMore: true, loadMoreFailed: true }) });
    expect(observers).toHaveLength(0);
  });

  it('stops watching when unmounted', () => {
    const { view } = setup({ more: more({ hasMore: true }) });
    view.unmount();
    expect(observers[0]!.disconnect).toHaveBeenCalled();
  });
});
