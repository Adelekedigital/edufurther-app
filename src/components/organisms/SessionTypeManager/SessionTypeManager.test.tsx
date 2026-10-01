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
  stages: [],
  customStage: null,
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
  const onRestore = vi.fn();
  const el = (l: Remote<OwnSessionType[]>, restoringIds: string[] = []) => (
    <SessionTypeManager
      list={l}
      restoringIds={restoringIds}
      messages={messages}
      onLiveChange={onLiveChange}
      onDelete={onDelete}
      createHref="/session-types/new"
      onEdit={onEdit}
      onFeature={vi.fn()}
      onRestore={onRestore}
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
    />
  );
  const { rerender } = render(el(list));
  return {
    onLiveChange,
    onDelete,
    onEdit,
    onDuplicate,
    onRestore,
    relist: (l: Remote<OwnSessionType[]>) => rerender(el(l)),
    rerenderWith: (l: Remote<OwnSessionType[]>, ids: string[]) => rerender(el(l, ids)),
  };
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

  it('topics: two, then "+N"; the full list is read out (product, 2026-09-30)', () => {
    const three = [
      { code: 'document-preparation', label: 'Document preparation' },
      { code: 'interview-preparation', label: 'Interview preparation' },
      { code: 'scholarships-financial-aid', label: 'Scholarships & financial aid' },
    ];
    setup(
      remote({
        data: [
          { ...T, id: 'a', name: 'Three topics', topics: three },
          { ...T, id: 'b', name: 'Two topics', topics: three.slice(0, 2) },
          { ...T, id: 'c', name: 'No topics', topics: [] },
        ],
      }),
    );
    const row = (name: string) => screen.getByRole('article', { name });
    const many = within(row('Three topics')).getByText(
      'Document preparation, Interview preparation, +1',
    );
    expect(many).toHaveAttribute('aria-hidden');
    expect(
      within(row('Three topics')).getByText(
        'Document preparation, Interview preparation, Scholarships & financial aid',
      ),
    ).toHaveClass('sr-only');
    expect(row('Two topics')).toHaveTextContent('Document preparation, Interview preparation');
    expect(row('Two topics')).not.toHaveTextContent('+');
    expect(row('No topics')).toHaveTextContent('Any topic');
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
    // The row menu (Session Types.dc.html): Edit, Duplicate, Delete; a hidden
    // type isn't offered "Mark as featured".
    const more = screen.getByRole('button', { name: 'More actions for Visa interview prep' });
    await user.click(more);
    const menu = screen.getByRole('menu', { name: 'More actions for Visa interview prep' });
    expect(
      within(menu)
        .getAllByRole('menuitem')
        .map((m: HTMLElement) => m.textContent),
    ).toEqual(['editEdit', 'content_copyDuplicate', 'deleteDelete']);
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
    // Shown on the row; the page's LiveRegion reads it out.
    expect(
      within(screen.getByRole('article', { name: 'SOP draft review' })).getByText(
        'Couldn’t hide it. Check your connection and try again.',
      ),
    ).toBeInTheDocument();
  });

  it('after "Keep it" works, focus moves to the switch it gives back (not the page)', async () => {
    const pending = {
      ...T,
      isLive: false,
      pendingDeletion: { deletesAfter: null, bookedCount: 1 },
    };
    const { onRestore, relist } = setup(remote({ data: [pending] }));
    await userEvent
      .setup()
      .click(screen.getByRole('button', { name: 'Keep it: SOP draft review' }));
    expect(onRestore).toHaveBeenCalled();
    relist(remote({ data: [{ ...pending, pendingDeletion: null }] }));
    expect(
      screen.getByRole('switch', { name: 'Visible to mentees: SOP draft review' }),
    ).toHaveFocus();
  });

  it('a "Keep it" that failed doesn’t pull focus later, when a refetch clears the deletion', async () => {
    const pending = {
      ...T,
      isLive: false,
      pendingDeletion: { deletesAfter: null, bookedCount: 1 },
    };
    const { relist, rerenderWith } = setup(remote({ data: [pending] }));
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Keep it: SOP draft review' }));
    rerenderWith(remote({ data: [pending] }), ['a']);
    rerenderWith(remote({ data: [pending] }), []);
    await user.click(screen.getByRole('link', { name: 'Create session type' }));
    relist(remote({ data: [{ ...pending, pendingDeletion: null }] }));
    expect(
      screen.getByRole('switch', { name: 'Visible to mentees: SOP draft review' }),
    ).not.toHaveFocus();
  });
});
