import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Remote } from '@/types/mentor';
import type { OwnSessionType } from '@/types/sessionType';
import { SessionTypeManager } from './SessionTypeManager';

const T: OwnSessionType = {
  id: 'a',
  name: 'SOP draft review',
  description: 'Leave with a revision list.',
  durationMin: 60,
  noticeMin: 1440,
  isLive: true,
  topics: [{ code: 'document-preparation', label: 'Document preparation' }],
  icon: 'edit_document',
  iconChoice: null,
  questionCount: 2,
  isFeatured: false,
  pendingDeletion: null,
  booked: { count: 0, lastEndsAt: null },
};
const remote = (over: Partial<Remote<OwnSessionType[]>>): Remote<OwnSessionType[]> => ({
  data: null,
  isLoading: false,
  error: null,
  retry: vi.fn(),
  ...over,
});
const setup = (list: Remote<OwnSessionType[]>, messages = {}) => {
  const onLiveChange = vi.fn();
  const onDelete = vi.fn();
  const onEdit = vi.fn();
  const onDuplicate = vi.fn();
  render(
    <SessionTypeManager
      list={list}
      messages={messages}
      onLiveChange={onLiveChange}
      onDelete={onDelete}
      createHref="/session-types/new"
      onEdit={onEdit}
      onFeature={vi.fn()}
      onRestore={vi.fn()}
      onDuplicate={onDuplicate}
      shareUrl={(t) => `https://x.test/mentors/m1?book=${t.id}`}
      templates={[
        {
          key: 'sop',
          href: '/session-types/new?template=sop',
          icon: 'edit_document',
          name: 'SOP draft review',
          hint: '60 min · 2 questions',
        },
      ]}
    />,
  );
  return { onLiveChange, onDelete, onEdit, onDuplicate };
};

describe('SessionTypeManager — the four states', () => {
  it('loading announces itself and shows no empty state', () => {
    setup(remote({ isLoading: true }));
    expect(screen.getByRole('status', { name: 'Loading your session types' })).toBeInTheDocument();
    expect(screen.queryByText('Create your first session type')).toBeNull();
  });

  it('error is checked before empty, and Try again retries', async () => {
    const list = remote({ data: [], error: { kind: 'server', message: 'x' } });
    setup(list);
    expect(
      screen.getByRole('heading', { name: 'We couldn’t load your session types' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Create your first session type')).toBeNull();
    await userEvent.setup().click(screen.getByRole('button', { name: 'Try again' }));
    expect(list.retry).toHaveBeenCalled();
  });

  it('empty offers a way forward: create, and the templates', () => {
    setup(remote({ data: [] }));
    expect(
      screen.getByRole('heading', { name: 'Create your first session type' }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Create session type' })).toHaveLength(2);
    expect(screen.getByRole('link', { name: /SOP draft review/ })).toHaveAttribute(
      'href',
      '/session-types/new?template=sop',
    );
  });

  it('content: each type is a named row; the switch and delete report the row', async () => {
    const user = userEvent.setup();
    const { onLiveChange, onDelete, onEdit, onDuplicate } = setup(
      remote({
        data: [T, { ...T, id: 'b', name: 'Visa interview prep', isLive: false, questionCount: 1 }],
      }),
    );
    expect(screen.getByRole('article', { name: 'SOP draft review' })).toHaveTextContent(
      '2 questions',
    );
    expect(screen.getByRole('article', { name: 'Visa interview prep' })).toHaveTextContent(
      'Hidden',
    );
    await user.click(screen.getByRole('switch', { name: /SOP draft review/ }));
    expect(onLiveChange).toHaveBeenCalledWith('a', false);
    // The row menu (Session Types.dc.html): Edit, Duplicate, Delete.
    const more = screen.getByRole('button', { name: 'More actions for Visa interview prep' });
    await user.click(more);
    const menu = screen.getByRole('menu', { name: 'More actions for Visa interview prep' });
    expect(
      within(menu)
        .getAllByRole('menuitem')
        .map((m: HTMLElement) => m.textContent),
    ).toEqual(['editEdit', 'content_copyDuplicate', 'starMark as featured', 'deleteDelete']);
    await user.click(within(menu).getByRole('menuitem', { name: /Delete/ }));
    expect(onDelete).toHaveBeenCalledWith(expect.objectContaining({ id: 'b' }));
    await user.click(more);
    await user.click(screen.getByRole('menuitem', { name: /Edit/ }));
    expect(onEdit).toHaveBeenCalledWith(expect.objectContaining({ id: 'b' }));
    await user.click(more);
    await user.click(screen.getByRole('menuitem', { name: /Duplicate/ }));
    expect(onDuplicate).toHaveBeenCalledWith(expect.objectContaining({ id: 'b' }));
    expect(
      screen.getByRole('button', { name: 'Copy share link for Visa interview prep' }),
    ).toBeInTheDocument();
  });

  it('a switch that did not save says so on its row', () => {
    setup(remote({ data: [T] }), { a: 'Couldn’t hide it. Check your connection and try again.' });
    // The row's own message (each row also has the copy link's polite status).
    expect(
      screen.getAllByRole('status').find((x) => x.textContent?.includes('Couldn’t hide it.')),
    ).toBeTruthy();
  });
});
