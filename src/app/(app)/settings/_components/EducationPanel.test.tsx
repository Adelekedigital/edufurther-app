import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EDUCATION_COPY, SETTINGS_COPY } from '@/lib/copy/settings';
import type { EducationEntry } from '@/types/mentor';
import { EducationPanel, rowOf } from './EducationPanel';

let read: {
  entries: EducationEntry[];
  status: 'loading' | 'error' | 'ready';
  retry: () => void;
  retrying: boolean;
  failures: number;
};
const addEducation = vi.fn();
const editEducation = vi.fn();
const removeEducation = vi.fn();
const reset = vi.fn();
let removeError: string | null = null;
/** Runs when a write "lands", before its modal closes (e.g. drop the row). */
let landed: (() => void) | null = null;

vi.mock('@/lib/api/data/profileEntries', async (orig) => ({
  // The pure body builders stay real.
  ...(await orig<typeof import('@/lib/api/data/profileEntries')>()),
  useOwnEducation: () => read,
  useEducationEdit: () => ({
    addEducation: (body: unknown, done: () => void) => {
      addEducation(body);
      landed?.();
      done();
    },
    editEducation: (id: string, body: unknown, done: () => void) => {
      editEducation(id, body);
      done();
    },
    removeEducation: (id: string, done: () => void) => {
      removeEducation(id);
      if (removeError) return;
      landed?.();
      done();
    },
    saving: false,
    removing: false,
    error: removeError,
    reset,
  }),
}));
vi.mock('@/lib/api/data/catalog', () => ({
  useDegreeLevels: () => ({
    levels: [
      { id: 'dl-undergraduate', code: 'undergraduate' },
      { id: 'dl-masters', code: 'masters' },
    ],
    status: 'ready',
    retry: vi.fn(),
  }),
}));

const entry = (over: Partial<EducationEntry> = {}): EducationEntry => ({
  id: 'e1',
  values: {
    school: 'University of Lagos',
    degree: 'BSc',
    course: 'Microbiology',
    start: 2018,
    end: 2022,
    current: true,
  },
  dateStart: '2018-09-01',
  dateEnd: '2022-07-01',
  levelId: 'dl-undergraduate',
  levelName: 'Undergraduate',
  ...over,
});

/** The list's own status region (the Snackbar is another). */
const listStatus = () =>
  within(screen.getByRole('region', { name: EDUCATION_COPY.title })).getByRole('status');

const ready = (entries = [entry()]) => {
  read = { entries, status: 'ready', retry: vi.fn(), retrying: false, failures: 0 };
};

beforeEach(() => {
  addEducation.mockReset();
  editEducation.mockReset();
  removeEducation.mockReset();
  reset.mockReset();
  removeError = null;
  landed = null;
});

describe('EducationPanel', () => {
  it('lists the saved degrees', () => {
    ready([
      entry(),
      entry({ id: 'e2', values: { ...entry().values, degree: 'MSc', course: 'Data' } }),
    ]);
    render(<EducationPanel userId="u1" />);
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent('BSc, Microbiology');
    expect(items[0]).toHaveTextContent('University of Lagos · 2018 – 2022');
  });

  it('a degree saved without an abbreviation shows its level’s name', () => {
    expect(rowOf(entry({ values: { ...entry().values, degree: 'Other' } })).degree).toBe(
      'Undergraduate',
    );
  });

  it('nothing saved: the empty state', () => {
    ready([]);
    render(<EducationPanel userId="u1" />);
    expect(screen.getByRole('heading', { name: EDUCATION_COPY.emptyTitle })).toBeInTheDocument();
  });

  it('a failed load says so (not the empty state), and Try again retries', async () => {
    const retry = vi.fn();
    read = { entries: [], status: 'error', retry, retrying: false, failures: 1 };
    render(<EducationPanel userId="u1" />);
    expect(listStatus()).toHaveTextContent(SETTINGS_COPY.loadError);
    expect(screen.queryByText(EDUCATION_COPY.emptyTitle)).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: SETTINGS_COPY.retry }));
    expect(retry).toHaveBeenCalled();
  });

  it('loading: announced busy', () => {
    read = { entries: [], status: 'loading', retry: vi.fn(), retrying: false, failures: 0 };
    render(<EducationPanel userId="u1" />);
    expect(listStatus()).toHaveTextContent(EDUCATION_COPY.loading);
  });

  it('Add opens the form; saving adds it and says "Education added"', async () => {
    ready([]);
    const user = userEvent.setup();
    render(<EducationPanel userId="u1" />);
    landed = () => ready([entry({ id: 'e9' })]);
    await user.click(screen.getByRole('button', { name: EDUCATION_COPY.add }));
    const dialog = screen.getByRole('dialog', { name: 'Add education' });
    // A mentee's form: the hint never mentions a mentor card.
    expect(
      within(dialog).getByRole('checkbox', { name: 'This is my current or most recent education' }),
    ).toHaveAccessibleDescription(
      'Marks the degree you’re studying now or finished most recently.',
    );
    await user.type(within(dialog).getByRole('textbox', { name: 'School' }), 'UCL');
    await user.selectOptions(within(dialog).getByRole('combobox', { name: 'Degree' }), 'MSc');
    await user.type(within(dialog).getByRole('textbox', { name: 'Course of study' }), 'Data');
    await user.click(within(dialog).getByRole('button', { name: 'Add education' }));
    expect(addEducation).toHaveBeenCalledWith(
      expect.objectContaining({
        school_name_raw: 'UCL',
        degree_abbreviation: 'MSc',
        degree_level_id: 'dl-masters',
        study_course: 'Data',
      }),
    );
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByText(EDUCATION_COPY.added)).toBeInTheDocument();
    // The empty state's Add is gone: focus lands on the header's.
    await waitFor(() =>
      expect(screen.getByRole('button', { name: EDUCATION_COPY.add })).toHaveFocus(),
    );
  });

  it('Escape closes the form without saving', async () => {
    ready();
    const user = userEvent.setup();
    render(<EducationPanel userId="u1" />);
    await user.click(screen.getByRole('button', { name: EDUCATION_COPY.add }));
    expect(screen.getByRole('dialog', { name: 'Add education' })).toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(addEducation).not.toHaveBeenCalled();
  });

  it('Edit opens it filled in; saving sends the change and says "Education updated"', async () => {
    ready();
    const user = userEvent.setup();
    render(<EducationPanel userId="u1" />);
    await user.click(screen.getByRole('button', { name: 'Edit BSc, Microbiology' }));
    const dialog = screen.getByRole('dialog', { name: 'Edit education' });
    const course = within(dialog).getByRole('textbox', { name: 'Course of study' });
    expect(course).toHaveValue('Microbiology');
    await user.clear(course);
    await user.type(course, 'Biochemistry');
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    expect(editEducation).toHaveBeenCalledWith('e1', { study_course: 'Biochemistry' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByText(EDUCATION_COPY.updated)).toBeInTheDocument();
  });

  it('the same toast twice is put in afresh, so it is read out again', async () => {
    ready();
    const user = userEvent.setup();
    render(<EducationPanel userId="u1" />);
    const edit = async (course: string) => {
      await user.click(screen.getByRole('button', { name: 'Edit BSc, Microbiology' }));
      const dialog = screen.getByRole('dialog', { name: 'Edit education' });
      const field = within(dialog).getByRole('textbox', { name: 'Course of study' });
      await user.clear(field);
      await user.type(field, course);
      await user.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    };
    await edit('Biochemistry');
    const first = screen.getByText(EDUCATION_COPY.updated);
    await edit('Biology');
    const second = screen.getByText(EDUCATION_COPY.updated);
    expect(second).not.toBe(first);
  });

  it('Delete asks first, naming the degree; Keep it keeps it', async () => {
    ready();
    const user = userEvent.setup();
    render(<EducationPanel userId="u1" />);
    await user.click(screen.getByRole('button', { name: 'Delete BSc, Microbiology' }));
    const confirm = screen.getByRole('alertdialog', { name: 'Delete this education?' });
    expect(confirm).toHaveTextContent(
      '“BSc, Microbiology” (University of Lagos, 2022) will be removed. This can’t be undone.',
    );
    await user.click(within(confirm).getByRole('button', { name: 'Keep it' }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(removeEducation).not.toHaveBeenCalled();
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
  });

  it('confirming deletes it, says "Education deleted" and puts focus on the heading', async () => {
    ready();
    const user = userEvent.setup();
    const { rerender } = render(<EducationPanel userId="u1" />);
    landed = () => ready([]);
    await user.click(screen.getByRole('button', { name: 'Delete BSc, Microbiology' }));
    await user.click(screen.getByRole('button', { name: 'Delete education' }));
    rerender(<EducationPanel userId="u1" />);
    expect(removeEducation).toHaveBeenCalledWith('e1');
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(screen.getByText(EDUCATION_COPY.deleted)).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 2, name: EDUCATION_COPY.title })).toHaveFocus(),
    );
  });

  it('a failed delete stays open with why', async () => {
    ready();
    removeError = 'We couldn’t delete it. Try again.';
    const user = userEvent.setup();
    render(<EducationPanel userId="u1" />);
    await user.click(screen.getByRole('button', { name: 'Delete BSc, Microbiology' }));
    await user.click(screen.getByRole('button', { name: 'Delete education' }));
    expect(screen.getByRole('alertdialog')).toHaveTextContent(removeError);
    expect(screen.queryByText(EDUCATION_COPY.deleted)).toBeNull();
  });
});
