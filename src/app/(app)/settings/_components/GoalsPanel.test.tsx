import { createRef } from 'react';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GoalsSaveError, type GoalsRead } from '@/lib/api/data/goals';
import { GOALS_COPY, GOALS_ERRORS, SAVE_COPY, SETTINGS_COPY } from '@/lib/copy/settings';
import { unsavedSave } from '@/lib/utils/leaveGuard';
import { GoalsPanel } from './GoalsPanel';
import type { PanelHandle } from './ProfilePanel';

let read: {
  read: GoalsRead | null;
  status: 'loading' | 'error' | 'ready';
  retry: () => void;
  retrying: boolean;
};
const mutateAsync = vi.fn();
let saveError: GoalsSaveError | null = null;
vi.mock('@/lib/api/data/goals', async (orig) => ({
  ...(await orig<typeof import('@/lib/api/data/goals')>()),
  useMenteeGoals: () => read,
  useSaveGoals: () => ({ mutateAsync, isPending: false, error: saveError, reset: vi.fn() }),
}));
const COUNTRIES = [
  { id: 'c-ng', label: 'Nigeria', code: 'NG' },
  { id: 'c-gb', label: 'United Kingdom', code: 'GB' },
  { id: 'c-ca', label: 'Canada', code: 'CA' },
  { id: 'c-us', label: 'United States', code: 'US' },
  { id: 'c-se', label: 'Sweden', code: 'SE' },
];
let levelsStatus: 'loading' | 'error' | 'ready' = 'ready';
vi.mock('@/lib/api/data/catalog', () => ({
  useCountries: () => ({ countries: COUNTRIES, status: 'ready', retry: vi.fn() }),
  useDegreeLevels: () => ({
    levels:
      levelsStatus === 'ready'
        ? [
            { id: 'l-b', code: 'bachelors' },
            { id: 'l-m', code: 'masters' },
            { id: 'l-d', code: 'doctorate' },
          ]
        : [],
    status: levelsStatus,
    retry: vi.fn(),
  }),
}));
vi.mock('@/lib/api/data/mentors', () => ({
  useTopics: () => ({
    topics: [
      { id: 'o-school', slug: 'school-selection', label: 'School selection' },
      { id: 'o-docs', slug: 'document-preparation', label: 'Document preparation' },
    ],
    isLoading: false,
    error: null,
    retry: vi.fn(),
  }),
}));
let schoolResults: { id: string; name: string }[] = [];
vi.mock('@/lib/api/data/mentorApplication', () => ({
  useInstitutionSearch: (q: string) => ({
    options: q.trim().length >= 2 ? schoolResults : [],
    isLoading: false,
  }),
}));

const goal = (over: Partial<NonNullable<GoalsRead['goal']>> = {}): GoalsRead['goal'] => ({
  id: 'g1',
  degree_goal: { id: 'l-m', code: 'masters', display_name: 'Master’s' },
  degree_goal_raw: null,
  field_of_study: 'Public health',
  target_start_term: null,
  notes: null,
  countries: [
    { code: 'GB', display_name: 'United Kingdom', priority: 1 },
    { code: 'CA', display_name: 'Canada', priority: 2 },
  ],
  needs: [{ id: 'o-docs', code: 'document-preparation', display_name: 'Document preparation' }],
  schools: [
    {
      id: 's1',
      institution_id: 'inst-7',
      institution_name: 'University of Toronto',
      school_name_raw: 'University of Toronto',
      position: 1,
    },
  ],
  ...over,
});

const ready = (r: Partial<GoalsRead> = {}) => {
  read = {
    read: { goal: goal(), originCode: 'NG', currentCode: 'NG', ...r },
    status: 'ready',
    retry: vi.fn(),
    retrying: false,
  };
};
// The footer shows once the form is dirty: wait for it, the edit's render may land a tick later.
const saveButton = () => screen.findByRole('button', { name: GOALS_COPY.save });
// Edit goals moves focus to "Where you're from" a frame later: wait for it,
// or typing can race the move on a slow runner (a CI flake).
const openEdit = async () => {
  await userEvent.click(screen.getByRole('button', { name: GOALS_COPY.edit }));
  await waitFor(() => expect(document.activeElement).toHaveAttribute('data-ff', 'origin'));
};

beforeEach(() => {
  mutateAsync.mockReset();
  mutateAsync.mockResolvedValue(undefined);
  saveError = null;
  schoolResults = [];
  levelsStatus = 'ready';
  window.scrollBy = vi.fn();
});

describe('GoalsPanel', () => {
  it('loading: the head and card shapes, announced busy', () => {
    read = { read: null, status: 'loading', retry: vi.fn(), retrying: false };
    render(<GoalsPanel userId="u1" />);
    expect(screen.getByLabelText(GOALS_COPY.loading)).toHaveAttribute('aria-busy', 'true');
  });

  it('a failed load says so, with Try again', async () => {
    const retry = vi.fn();
    read = { read: null, status: 'error', retry, retrying: false };
    render(<GoalsPanel userId="u1" />);
    expect(screen.getByText(SETTINGS_COPY.loadError)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: SETTINGS_COPY.retry }));
    expect(retry).toHaveBeenCalled();
  });

  it('a saved goal shows the summary card first', () => {
    ready();
    render(<GoalsPanel userId="u1" />);
    expect(screen.getByRole('heading', { name: GOALS_COPY.head })).toBeInTheDocument();
    expect(screen.getByText('Master’s in Public health')).toBeInTheDocument();
    expect(
      screen.getByText('United Kingdom, Canada · 1 school · 1 help topic'),
    ).toBeInTheDocument();
    expect(screen.queryByText(GOALS_COPY.workingToward)).toBeNull();
    expect(screen.queryByRole('button', { name: GOALS_COPY.collapse })).toBeNull();
  });

  it('no goal: the fields are open, with "Where you’re from" prefilled from where they live', () => {
    ready({ goal: null, originCode: null, currentCode: 'NG' });
    render(<GoalsPanel userId="u1" />);
    expect(screen.getByText(GOALS_COPY.workingToward)).toBeInTheDocument();
    expect(screen.getByLabelText(GOALS_COPY.origin)).toHaveValue('Nigeria');
    expect(screen.queryByRole('button', { name: GOALS_COPY.edit })).toBeNull();
    // Nothing changed yet: no footer.
    expect(screen.queryByRole('button', { name: GOALS_COPY.save })).toBeNull();
  });

  it('Edit goals opens the fields and focuses the first; Applying for is one choice', async () => {
    ready();
    render(<GoalsPanel userId="u1" />);
    await openEdit();
    await waitFor(() => expect(screen.getByLabelText(GOALS_COPY.origin)).toHaveFocus());
    const group = screen.getByRole('radiogroup', { name: GOALS_COPY.applyingFor });
    expect(within(group).getByRole('radio', { name: 'Master’s' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    await userEvent.click(within(group).getByRole('radio', { name: 'PhD' }));
    expect(within(group).getByRole('radio', { name: 'PhD' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect(within(group).getByRole('radio', { name: 'Master’s' })).toHaveAttribute(
      'aria-checked',
      'false',
    );
    expect(screen.getByText(GOALS_COPY.applyingForHint)).toBeInTheDocument();
  });

  it('arrows move the choice and focus within the radio group', async () => {
    ready();
    render(<GoalsPanel userId="u1" />);
    await openEdit();
    await waitFor(() => expect(screen.getByLabelText(GOALS_COPY.origin)).toHaveFocus());
    const masters = screen.getByRole('radio', { name: 'Master’s' });
    expect(masters).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('radio', { name: 'PhD' })).toHaveAttribute('tabindex', '-1');
    masters.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: 'MBA' })).toHaveFocus();
    expect(screen.getByRole('radio', { name: 'MBA' })).toHaveAttribute('aria-checked', 'true');
  });

  it('a saved MBA reads back as MBA (Master’s + raw "MBA")', () => {
    ready({ goal: goal({ degree_goal_raw: 'MBA' }) });
    render(<GoalsPanel userId="u1" />);
    expect(screen.getByText('MBA in Public health')).toBeInTheDocument();
  });

  it('countries: at most 3, then the others and the adder are disabled', async () => {
    ready();
    render(<GoalsPanel userId="u1" />);
    await openEdit();
    await userEvent.click(screen.getByRole('button', { name: 'United States' }));
    expect(screen.getByRole('button', { name: 'United States' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: GOALS_COPY.addCountry })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'United Kingdom' }));
    expect(screen.getByRole('button', { name: GOALS_COPY.addCountry })).toBeEnabled();
    await userEvent.click(screen.getByRole('button', { name: GOALS_COPY.addCountry }));
    await userEvent.type(screen.getByRole('combobox', { name: GOALS_COPY.addCountry }), 'swe');
    await userEvent.keyboard('{Enter}');
    expect(screen.getByRole('button', { name: 'Sweden' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('schools: a catalogue pick, a typed name kept, 120 characters, 10 at most', async () => {
    ready({ goal: goal({ schools: [] }) });
    schoolResults = [{ id: 'inst-8', name: 'University College London' }];
    render(<GoalsPanel userId="u1" />);
    await openEdit();
    const field = screen.getByRole('combobox', { name: GOALS_COPY.addSchool });
    expect(field).toHaveAttribute('maxLength', '120');
    await userEvent.type(field, 'Univ');
    await userEvent.click(screen.getByRole('option', { name: 'University College London' }));
    expect(screen.getByRole('button', { name: 'Remove University College London' })).toBeVisible();
    schoolResults = [];
    for (let i = 1; i <= 9; i++) await userEvent.type(field, `School ${i}{Enter}`);
    expect(screen.getByRole('button', { name: 'Remove School 9' })).toBeVisible();
    // Read-only, not disabled: focus stays in the field that took the tenth.
    expect(field).toHaveAttribute('aria-disabled', 'true');
    expect(field).toHaveAttribute('readonly');
    expect(field).toHaveFocus();
    expect(screen.getByText(GOALS_COPY.schoolsFull)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Remove School 9' }));
    expect(field).not.toHaveAttribute('readonly');
  });

  it('Save with gaps: the form line, each error, focus on the first, nothing sent', async () => {
    ready({ goal: null, originCode: null, currentCode: null });
    render(<GoalsPanel userId="u1" />);
    await userEvent.type(screen.getByLabelText(GOALS_COPY.field), 'L');
    await userEvent.click(await saveButton());
    expect(screen.getAllByRole('alert').some((a) => a.textContent === SAVE_COPY.formError)).toBe(
      true,
    );
    for (const e of Object.values(GOALS_ERRORS)) expect(screen.getByText(e)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText(GOALS_COPY.origin)).toHaveFocus());
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('Save sends origin, MBA as Master’s + "MBA", the lists; then the toast and the card', async () => {
    ready({ originCode: null, currentCode: 'NG' });
    render(<GoalsPanel userId="u1" />);
    await openEdit();
    await userEvent.click(screen.getByRole('radio', { name: 'MBA' }));
    await userEvent.click(await saveButton());
    expect(mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        savedOriginId: '',
        after: expect.objectContaining({
          originId: 'c-ng',
          degree: 'mba',
          countryIds: ['c-gb', 'c-ca'],
          needIds: ['o-docs'],
          schools: [
            {
              institutionId: 'inst-7',
              raw: 'University of Toronto',
              label: 'University of Toronto',
            },
          ],
        }),
      }),
    );
    expect(await screen.findByText(GOALS_COPY.saved)).toBeInTheDocument();
    expect(screen.getByText('MBA in Public health')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: GOALS_COPY.edit })).toHaveFocus(),
    );
  });

  it('a failed save keeps the fields and says so', async () => {
    ready();
    mutateAsync.mockRejectedValueOnce(new GoalsSaveError(GOALS_COPY.saveFailed));
    const { rerender } = render(<GoalsPanel userId="u1" />);
    await openEdit();
    await userEvent.click(screen.getByRole('radio', { name: 'PhD' }));
    await userEvent.click(await saveButton());
    saveError = new GoalsSaveError(GOALS_COPY.saveFailed);
    rerender(<GoalsPanel userId="u1" />);
    expect(screen.getByRole('alert')).toHaveTextContent(GOALS_COPY.saveFailed);
    expect(screen.getByRole('radio', { name: 'PhD' })).toHaveAttribute('aria-checked', 'true');
  });

  it('the footer’s alert region is there before its line, so the line is heard', async () => {
    ready();
    render(<GoalsPanel userId="u1" />);
    await openEdit();
    await userEvent.clear(screen.getByLabelText(GOALS_COPY.field));
    const region = screen.getByRole('alert');
    expect(region).toBeEmptyDOMElement();
    await userEvent.click(await saveButton());
    expect(region).toHaveTextContent(SAVE_COPY.formError);
  });

  it('Cancel restores the saved goal and goes back to the card', async () => {
    ready();
    render(<GoalsPanel userId="u1" />);
    await openEdit();
    await userEvent.clear(screen.getByLabelText(GOALS_COPY.field));
    await userEvent.type(screen.getByLabelText(GOALS_COPY.field), 'Law');
    await userEvent.click(screen.getByRole('button', { name: GOALS_COPY.cancel }));
    expect(screen.getByText('Master’s in Public health')).toBeInTheDocument();
    await openEdit();
    expect(screen.getByLabelText(GOALS_COPY.field)).toHaveValue('Public health');
  });

  it('collapsing with unsaved changes asks first; Discard restores and collapses', async () => {
    ready();
    render(<GoalsPanel userId="u1" />);
    await openEdit();
    await userEvent.click(screen.getByRole('radio', { name: 'PhD' }));
    await userEvent.click(screen.getByRole('button', { name: GOALS_COPY.collapse }));
    const dialog = screen.getByRole('alertdialog');
    expect(dialog).toHaveTextContent(GOALS_COPY.collapseSub);
    await userEvent.click(within(dialog).getByRole('button', { name: 'Discard' }));
    expect(screen.getByText('Master’s in Public health')).toBeInTheDocument();
  });

  it('collapsing with nothing changed just collapses', async () => {
    ready();
    render(<GoalsPanel userId="u1" />);
    await openEdit();
    await userEvent.click(screen.getByRole('button', { name: GOALS_COPY.collapse }));
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(screen.getByRole('button', { name: GOALS_COPY.edit })).toBeInTheDocument();
  });

  it('an unsaved edit registers its own save with the leave guard', async () => {
    ready();
    render(<GoalsPanel userId="u1" />);
    await openEdit();
    await userEvent.click(screen.getByRole('radio', { name: 'PhD' }));
    const save = unsavedSave();
    expect(save).not.toBeNull();
    let saved = false;
    await act(async () => {
      saved = await save!();
    });
    expect(saved).toBe(true);
    expect(mutateAsync).toHaveBeenCalledOnce();
  });

  it('the degree levels fail after /me loaded: the error state with Try again, not a skeleton', () => {
    ready();
    levelsStatus = 'error';
    render(<GoalsPanel userId="u1" />);
    expect(screen.getByText(SETTINGS_COPY.loadError)).toBeInTheDocument();
    expect(screen.queryByLabelText(GOALS_COPY.loading)).toBeNull();
  });

  it('where they’re from saved but the goal didn’t: the footer and its error stay', async () => {
    ready();
    mutateAsync.mockRejectedValueOnce(new GoalsSaveError(GOALS_COPY.saveFailed, true));
    const { rerender } = render(<GoalsPanel userId="u1" />);
    await openEdit();
    const origin = screen.getByLabelText(GOALS_COPY.origin);
    await userEvent.clear(origin);
    await userEvent.type(origin, 'Canada{Enter}');
    expect(origin).toHaveValue('Canada');
    await userEvent.click(await saveButton());
    saveError = new GoalsSaveError(GOALS_COPY.saveFailed, true);
    rerender(<GoalsPanel userId="u1" />);
    expect(await saveButton()).toBeInTheDocument();
    expect(screen.getAllByRole('alert').some((a) => a.textContent === GOALS_COPY.saveFailed)).toBe(
      true,
    );
  });

  it('a save asked for from outside (tab switch, leave guard) doesn’t move focus', async () => {
    ready();
    const ref = createRef<PanelHandle>();
    render(<GoalsPanel ref={ref} userId="u1" />);
    await openEdit();
    const phd = screen.getByRole('radio', { name: 'PhD' });
    await userEvent.click(phd);
    let saved = false;
    await act(async () => {
      saved = await ref.current!.save();
    });
    expect(saved).toBe(true);
    await act(() => new Promise((r) => setTimeout(r, 50)));
    expect(screen.getByRole('button', { name: GOALS_COPY.edit })).not.toHaveFocus();
    await openEdit();
    await userEvent.click(screen.getByRole('radio', { name: 'MBA' }));
    await act(async () => {
      await unsavedSave()!();
    });
    await act(() => new Promise((r) => setTimeout(r, 50)));
    expect(screen.getByRole('button', { name: GOALS_COPY.edit })).not.toHaveFocus();
  });

  it('after a save, the refetched goal comes in', async () => {
    ready();
    const { rerender } = render(<GoalsPanel userId="u1" />);
    await openEdit();
    await userEvent.click(screen.getByRole('radio', { name: 'PhD' }));
    await userEvent.click(await saveButton());
    expect(await screen.findByText('PhD in Public health')).toBeInTheDocument();
    ready({ goal: goal({ field_of_study: 'Epidemiology' }) });
    rerender(<GoalsPanel userId="u1" />);
    expect(screen.getByText('Master’s in Epidemiology')).toBeInTheDocument();
  });

  it('only the degree missing: Save focuses the first choice', async () => {
    ready({ goal: goal({ degree_goal: null }) });
    render(<GoalsPanel userId="u1" />);
    await openEdit();
    await userEvent.type(screen.getByLabelText(GOALS_COPY.field), 's');
    await userEvent.click(await saveButton());
    await waitFor(() => expect(screen.getByRole('radio', { name: 'Bachelor’s' })).toHaveFocus());
    expect(screen.getByRole('radiogroup', { name: GOALS_COPY.applyingFor })).toHaveAttribute(
      'aria-required',
      'true',
    );
  });

  it('the cards are h3s under "Your goals"', async () => {
    ready();
    render(<GoalsPanel userId="u1" />);
    await openEdit();
    expect(screen.getByRole('heading', { level: 2, name: GOALS_COPY.head })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 3, name: GOALS_COPY.workingToward }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: GOALS_COPY.help })).toBeInTheDocument();
  });
});
