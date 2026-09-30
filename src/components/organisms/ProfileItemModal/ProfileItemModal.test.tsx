import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState, type ReactNode } from 'react';
import { ProfileItemModal, type ItemShell } from './ProfileItemModal';

const shell = (s: ItemShell, body: ReactNode) => (
  <div role="dialog" aria-label={s.title} aria-describedby="sub">
    <p id="sub">{s.subtitle}</p>
    {body}
  </div>
);
const ready = { status: 'ready' as const, onRetry: vi.fn() };
const groups = [
  {
    label: 'Choosing where to go',
    items: [
      { id: 'o1', slug: 'school-selection', label: 'School selection' },
      { id: 'o3', slug: 'program-selection', label: 'Program selection' },
    ],
  },
  {
    label: 'Funding',
    items: [{ id: 'o6', slug: 'scholarships-financial-aid', label: 'Scholarships' }],
  },
];

function topics(over: Partial<Parameters<typeof ProfileItemModal>[0]> = {}) {
  const onSave = vi.fn();
  const onClose = vi.fn();
  render(
    <ProfileItemModal
      kind="topics"
      groups={groups}
      initial={['o1']}
      catalog={ready}
      saving={false}
      error={null}
      onSave={onSave}
      onClose={onClose}
      renderShell={shell}
      {...(over as object)}
    />,
  );
  return { onSave, onClose, user: userEvent.setup() };
}

const countries = [
  { id: 'ng', label: 'Nigeria' },
  { id: 'us', label: 'United States' },
];
const langs = {
  results: [
    { id: 'en', label: 'English' },
    { id: 'yo', label: 'Yoruba' },
  ],
  query: '',
  onQueryChange: vi.fn(),
  status: 'ready' as const,
  onRetry: vi.fn(),
};

function background(initial = { originId: 'ng', studyId: 'us', languages: [langs.results[0]!] }) {
  const onSave = vi.fn();
  const onClose = vi.fn();
  render(
    <ProfileItemModal
      kind="background"
      countries={countries}
      languages={langs}
      initial={initial}
      catalog={ready}
      saving={false}
      error={null}
      onSave={onSave}
      onClose={onClose}
      renderShell={shell}
    />,
  );
  return { onSave, onClose, user: userEvent.setup() };
}

describe('ProfileItemModal — topics', () => {
  it('shows the groups as labelled groups of toggle chips, with the count', async () => {
    const { user } = topics();
    const dialog = screen.getByRole('dialog', { name: 'What you help with' });
    expect(dialog).toHaveAccessibleDescription('1 selected · pick the topics you’re strongest in');
    const group = screen.getByRole('group', { name: 'Choosing where to go' });
    expect(within(group).getByRole('button', { name: 'School selection' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await user.click(screen.getByRole('button', { name: 'Scholarships' }));
    expect(dialog).toHaveAccessibleDescription('2 selected · pick the topics you’re strongest in');
  });

  it('saves the chosen ids', async () => {
    const { user, onSave } = topics();
    await user.click(screen.getByRole('button', { name: 'Program selection' }));
    await user.click(screen.getByRole('button', { name: 'Save topics' }));
    expect(onSave).toHaveBeenCalledWith(['o1', 'o3']);
  });

  it('with none picked, Save says why instead of saving', async () => {
    const { user, onSave } = topics();
    await user.click(screen.getByRole('button', { name: 'School selection' }));
    await user.click(screen.getByRole('button', { name: 'Save topics' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Pick at least one topic.');
    expect(onSave).not.toHaveBeenCalled();
  });

  it('unchanged, Save just closes (nothing is sent)', async () => {
    const { user, onSave, onClose } = topics();
    await user.click(screen.getByRole('button', { name: 'Save topics' }));
    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('a failed save is said in place, and Save stays focusable while saving', () => {
    topics({ error: 'That didn’t save. Try again.', saving: true });
    expect(screen.getByRole('alert')).toHaveTextContent('That didn’t save. Try again.');
    expect(screen.getByRole('button', { name: 'Saving…' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  it('the catalog’s states: loading, then error (before empty) with Retry, then empty', async () => {
    const onRetry = vi.fn();
    const { unmount } = render(
      <ProfileItemModal
        kind="topics"
        groups={[]}
        initial={[]}
        catalog={{ status: 'loading', onRetry }}
        saving={false}
        error={null}
        onSave={vi.fn()}
        onClose={vi.fn()}
        renderShell={shell}
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Loading…');
    expect(screen.getByRole('button', { name: 'Save topics' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    unmount();
    const user = userEvent.setup();
    const r = render(
      <ProfileItemModal
        kind="topics"
        groups={[]}
        initial={[]}
        catalog={{ status: 'error', onRetry }}
        saving={false}
        error={null}
        onSave={vi.fn()}
        onClose={vi.fn()}
        renderShell={shell}
      />,
    );
    expect(screen.getByText(/couldn’t load the topics/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalled();
    r.unmount();
    render(
      <ProfileItemModal
        kind="topics"
        groups={[]}
        initial={[]}
        catalog={ready}
        saving={false}
        error={null}
        onSave={vi.fn()}
        onClose={vi.fn()}
        renderShell={shell}
      />,
    );
    expect(screen.getByText(/no topics to choose from/)).toBeInTheDocument();
  });

  it('Remove (where offered) asks first', async () => {
    const onRemove = vi.fn();
    const { user } = topics({ remove: { noun: 'award', onRemove, removing: false } });
    await user.click(screen.getByRole('button', { name: 'Remove award' }));
    expect(onRemove).not.toHaveBeenCalled();
    const confirm = screen.getByRole('group', { name: 'Remove this award?' });
    await user.click(within(confirm).getByRole('button', { name: 'Keep it' }));
    expect(screen.queryByRole('group', { name: 'Remove this award?' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Remove award' }));
    await user.click(screen.getByRole('button', { name: 'Remove' }));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });
});

describe('ProfileItemModal — review of #85', () => {
  it('the draft starts from the catalog when it arrives, without remounting the frame', () => {
    let mounts = 0;
    function Frame({ children }: { children: ReactNode }) {
      const [id] = useState(() => ++mounts);
      return (
        <div role="dialog" aria-label="frame" data-mount={id}>
          {children}
        </div>
      );
    }
    const props = {
      kind: 'topics' as const,
      groups: [],
      initial: [] as string[],
      catalog: { status: 'loading' as const, onRetry: vi.fn() },
      saving: false,
      error: null,
      onSave: vi.fn(),
      onClose: vi.fn(),
      renderShell: (_s: ItemShell, body: ReactNode) => <Frame>{body}</Frame>,
    };
    const { rerender } = render(<ProfileItemModal {...props} />);
    rerender(<ProfileItemModal {...props} groups={groups} initial={['o1']} catalog={ready} />);
    expect(screen.getByRole('button', { name: 'School selection' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(mounts).toBe(1);
    // A later refetch failure, then success, doesn't reset it.
    rerender(
      <ProfileItemModal
        {...props}
        groups={groups}
        initial={['o3']}
        catalog={{ status: 'error', onRetry: vi.fn() }}
      />,
    );
    rerender(<ProfileItemModal {...props} groups={groups} initial={['o3']} catalog={ready} />);
    expect(screen.getByRole('button', { name: 'School selection' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('after a failed save, Save always sends, even with the draft as it opened', async () => {
    const { user, onSave, onClose } = topics({ error: 'That didn’t save. Try again.' });
    await user.click(screen.getByRole('button', { name: 'Save topics' }));
    expect(onSave).toHaveBeenCalledWith(['o1']);
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('ProfileItemModal — background', () => {
  it('prefills the two countries and the languages, and saves the change', async () => {
    const { user, onSave } = background();
    expect(screen.getByRole('combobox', { name: 'From' })).toHaveValue('Nigeria');
    expect(screen.getByRole('combobox', { name: 'Studied in' })).toHaveValue('United States');
    const group = screen.getByRole('group', { name: 'Languages you mentor in' });
    expect(within(group).getByRole('button', { name: 'Remove English' })).toBeInTheDocument();
    await user.click(within(group).getByRole('button', { name: 'Yoruba' }));
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(onSave).toHaveBeenCalledWith({
      originId: 'ng',
      studyId: 'us',
      languages: [
        { id: 'en', label: 'English' },
        { id: 'yo', label: 'Yoruba' },
      ],
    });
  });

  it('says what’s missing, field by field, and focuses the first', async () => {
    const { user, onSave } = background({ originId: '', studyId: 'us', languages: [] });
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(onSave).not.toHaveBeenCalled();
    const from = screen.getByRole('combobox', { name: 'From' });
    expect(from).toHaveAccessibleDescription('Pick where you’re from.');
    expect(from).toHaveFocus();
    expect(
      screen.getByRole('group', { name: 'Languages you mentor in' }),
    ).toHaveAccessibleDescription('Add a language you mentor in.');
  });

  it('removing a language pill takes it out', async () => {
    const { user, onSave } = background({
      originId: 'ng',
      studyId: 'us',
      languages: [langs.results[0]!, langs.results[1]!],
    });
    await user.click(screen.getByRole('button', { name: 'Remove Yoruba' }));
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ languages: [{ id: 'en', label: 'English' }] }),
    );
  });

  it('unchanged, Save just closes', async () => {
    const { user, onSave, onClose } = background();
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(onSave).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });
});
