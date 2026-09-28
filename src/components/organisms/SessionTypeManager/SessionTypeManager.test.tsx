import { render, screen } from '@testing-library/react';
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
  topic: { code: 'application-documents', label: 'Application documents' },
  icon: 'edit_document',
  iconChoice: null,
  questionCount: 2,
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
  render(
    <SessionTypeManager
      list={list}
      messages={messages}
      onLiveChange={onLiveChange}
      onDelete={onDelete}
      createHref="/session-types/new"
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
  return { onLiveChange, onDelete };
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
    const { onLiveChange, onDelete } = setup(
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
    await user.click(screen.getByRole('button', { name: 'Delete Visa interview prep' }));
    expect(onDelete).toHaveBeenCalledWith(expect.objectContaining({ id: 'b' }));
    // Edit ships with the edit screen (PR 4); no dead button meanwhile.
    expect(screen.queryByRole('link', { name: /Edit/ })).toBeNull();
  });

  it('a switch that did not save says so on its row', () => {
    setup(remote({ data: [T] }), { a: 'Couldn’t hide it. Check your connection and try again.' });
    expect(screen.getByRole('status')).toHaveTextContent('Couldn’t hide it.');
  });
});
