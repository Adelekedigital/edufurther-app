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
      { id: 'o-prog', slug: 'program-selection', label: 'Program selection' },
      { id: 'o-test', slug: 'test-preparation', label: 'Test preparation' },
      { id: 'o-schol', slug: 'scholarships-financial-aid', label: 'Scholarships' },
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
// The bar shows once the form is dirty: wait for it, the edit's render may land a tick later.
const saveButton = () => screen.findByRole('button', { name: SAVE_COPY.save });
const bar = () => screen.queryByRole('region', { name: SAVE_COPY.barLabel });

beforeEach(() => {
  mutateAsync.mockReset();
  mutateAsync.mockResolvedValue(undefined);
  saveError = null;
  schoolResults = [];
  levelsStatus = 'ready';
  window.scrollBy = vi.fn();
});

describe('GoalsPanel', () => {
  it('loading: the two cards’ shapes, announced busy', () => {
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

  it('a saved goal: the fields, always open, as h2 cards; no bar until a change', () => {
    ready();
    render(<GoalsPanel userId="u1" />);
    expect(
      screen.getByRole('heading', { level: 2, name: GOALS_COPY.workingToward }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: GOALS_COPY.help })).toBeInTheDocument();
    expect(screen.getByLabelText(GOALS_COPY.field)).toHaveValue('Public health');
    expect(screen.queryByRole('button', { name: /edit goals|collapse goals/i })).toBeNull();
    expect(bar()).toBeNull();
  });

  it('no goal: "Where you’re from" prefilled from where they live', () => {
    ready({ goal: null, originCode: null, currentCode: 'NG' });
    render(<GoalsPanel userId="u1" />);
    expect(screen.getByLabelText(GOALS_COPY.origin)).toHaveValue('Nigeria');
    expect(bar()).toBeNull();
  });

  it('Applying for is one choice', async () => {
    ready();
    render(<GoalsPanel userId="u1" />);
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
    const masters = screen.getByRole('radio', { name: 'Master’s' });
    expect(masters).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('radio', { name: 'PhD' })).toHaveAttribute('tabindex', '-1');
    masters.focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: 'MBA' })).toHaveFocus();
    expect(screen.getByRole('radio', { name: 'MBA' })).toHaveAttribute('aria-checked', 'true');
  });

  it('countries: at most 3, then the others and the adder are disabled', async () => {
    ready();
    render(<GoalsPanel userId="u1" />);
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

  it('help areas: up to 3, hinted; the others dim and can’t be picked', async () => {
    ready();
    render(<GoalsPanel userId="u1" />);
    const group = screen.getByRole('group', { name: GOALS_COPY.help });
    expect(group).toHaveAccessibleDescription(GOALS_COPY.helpHint);
    await userEvent.click(within(group).getByRole('button', { name: /Find a program/ }));
    await userEvent.click(within(group).getByRole('button', { name: /Test preparation/ }));
    const fourth = within(group).getByRole('button', { name: /Scholarship guidance/ });
    expect(fourth).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(fourth);
    expect(fourth).toHaveAttribute('aria-pressed', 'false');
    // Unpicking one frees a place again.
    await userEvent.click(within(group).getByRole('button', { name: /Test preparation/ }));
    expect(fourth).not.toHaveAttribute('aria-disabled');
  });

  it('more than 3 saved before the cap: all show picked, Save says to pick up to 3', async () => {
    const need = (id: string, code: string) => ({ id, code, display_name: code });
    ready({
      goal: goal({
        needs: [
          need('o-docs', 'document-preparation'),
          need('o-prog', 'program-selection'),
          need('o-test', 'test-preparation'),
          need('o-schol', 'scholarships-financial-aid'),
        ],
      }),
    });
    render(<GoalsPanel userId="u1" />);
    const group = screen.getByRole('group', { name: GOALS_COPY.help });
    expect(within(group).getAllByRole('button', { pressed: true })).toHaveLength(4);
    await userEvent.click(screen.getByRole('radio', { name: 'MBA' }));
    await userEvent.click(await saveButton());
    expect(screen.getAllByText(SAVE_COPY.formError).length).toBeGreaterThan(0);
    expect(screen.getByText(GOALS_ERRORS.helpMax)).toBeInTheDocument();
    await waitFor(() => expect(group).toHaveFocus());
    expect(mutateAsync).not.toHaveBeenCalled();
    // Unpicking one clears it, and the save goes.
    await userEvent.click(within(group).getByRole('button', { name: /Scholarship guidance/ }));
    expect(screen.queryByText(GOALS_ERRORS.helpMax)).toBeNull();
    await userEvent.click(await saveButton());
    expect(mutateAsync).toHaveBeenCalledTimes(1);
  });

  it('a retired offering does not count toward the cap, and is dropped only past it', async () => {
    const need = (id: string, code: string) => ({ id, code, display_name: code });
    ready({
      goal: goal({
        needs: [
          need('o-retired', 'retired-offering'),
          need('o-prog', 'program-selection'),
          need('o-test', 'test-preparation'),
          need('o-schol', 'scholarships-financial-aid'),
        ],
      }),
    });
    render(<GoalsPanel userId="u1" />);
    const group = screen.getByRole('group', { name: GOALS_COPY.help });
    expect(within(group).getAllByRole('button', { pressed: true })).toHaveLength(3);
    await userEvent.click(screen.getByRole('radio', { name: 'MBA' }));
    await userEvent.click(await saveButton());
    expect(screen.queryByText(GOALS_ERRORS.helpMax)).toBeNull();
    expect(mutateAsync).toHaveBeenCalledTimes(1);
    // Four ids would be a 422 at /need_ids, so only the three visible picks go.
    expect(mutateAsync.mock.calls[0]![0].after.needIds).toEqual(['o-prog', 'o-test', 'o-schol']);
  });

  it('"Not sure yet": on with no countries, clears them, stays usable at the limit', async () => {
    ready();
    render(<GoalsPanel userId="u1" />);
    const notSure = () => screen.getByRole('button', { name: GOALS_COPY.notSure });
    expect(notSure()).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(screen.getByRole('button', { name: 'United States' }));
    expect(notSure()).toBeEnabled();
    await userEvent.click(notSure());
    expect(notSure()).toHaveAttribute('aria-pressed', 'true');
    for (const c of ['United Kingdom', 'Canada', 'United States'])
      expect(screen.getByRole('button', { name: c })).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(screen.getByRole('button', { name: 'Canada' }));
    expect(notSure()).toHaveAttribute('aria-pressed', 'false');
  });

  it('"Not sure yet" saves: no countries is never a gap, and the list goes as []', async () => {
    ready();
    render(<GoalsPanel userId="u1" />);
    await userEvent.click(screen.getByRole('button', { name: GOALS_COPY.notSure }));
    await userEvent.click(await saveButton());
    expect(mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ after: expect.objectContaining({ countryIds: [] }) }),
    );
    expect(await screen.findByText(GOALS_COPY.saved)).toBeInTheDocument();
  });

  it('schools: a catalogue pick, a typed name kept, 120 characters, 10 at most', async () => {
    ready({ goal: goal({ schools: [] }) });
    schoolResults = [{ id: 'inst-8', name: 'University College London' }];
    render(<GoalsPanel userId="u1" />);
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

  it('a change raises the save bar; Discard restores the saved goal and the bar goes', async () => {
    ready();
    render(<GoalsPanel userId="u1" />);
    await userEvent.clear(screen.getByLabelText(GOALS_COPY.field));
    await userEvent.type(screen.getByLabelText(GOALS_COPY.field), 'Law');
    await saveButton();
    expect(bar()).toHaveTextContent(GOALS_COPY.bar);
    await userEvent.click(screen.getByRole('button', { name: SAVE_COPY.discard }));
    expect(screen.getByLabelText(GOALS_COPY.field)).toHaveValue('Public health');
    expect(bar()).toBeNull();
    // Focus held by the bar moves to the first card's heading.
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: GOALS_COPY.workingToward })).toHaveFocus(),
    );
  });

  it('Save with gaps: the form line in the bar, each error, focus on the first, nothing sent', async () => {
    ready({ goal: null, originCode: null, currentCode: null });
    render(<GoalsPanel userId="u1" />);
    await userEvent.type(screen.getByLabelText(GOALS_COPY.field), 'L');
    await userEvent.click(await saveButton());
    expect(screen.getAllByText(SAVE_COPY.formError).length).toBeGreaterThan(0);
    const { helpMax, ...missing } = GOALS_ERRORS;
    for (const e of Object.values(missing)) expect(screen.getByText(e)).toBeInTheDocument();
    expect(screen.queryByText(helpMax)).toBeNull();
    await waitFor(() => expect(screen.getByLabelText(GOALS_COPY.origin)).toHaveFocus());
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it('Save sends origin, MBA as Master’s + "MBA", the lists; then the toast, and the bar goes', async () => {
    ready({ originCode: null, currentCode: 'NG' });
    render(<GoalsPanel userId="u1" />);
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
    expect(bar()).toBeNull();
  });

  it('a failed save keeps the edit and the bar, with its error', async () => {
    ready();
    mutateAsync.mockRejectedValueOnce(new GoalsSaveError(GOALS_COPY.saveFailed));
    const { rerender } = render(<GoalsPanel userId="u1" />);
    await userEvent.click(screen.getByRole('radio', { name: 'PhD' }));
    await userEvent.click(await saveButton());
    saveError = new GoalsSaveError(GOALS_COPY.saveFailed);
    rerender(<GoalsPanel userId="u1" />);
    expect(screen.getAllByText(GOALS_COPY.saveFailed).length).toBeGreaterThan(0);
    expect(bar()).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'PhD' })).toHaveAttribute('aria-checked', 'true');
  });

  it('where they’re from saved but the goal didn’t: the bar and its error stay', async () => {
    ready();
    mutateAsync.mockRejectedValueOnce(new GoalsSaveError(GOALS_COPY.saveFailed, true));
    const { rerender } = render(<GoalsPanel userId="u1" />);
    const origin = screen.getByLabelText(GOALS_COPY.origin);
    await userEvent.clear(origin);
    await userEvent.type(origin, 'Canada{Enter}');
    expect(origin).toHaveValue('Canada');
    await userEvent.click(await saveButton());
    saveError = new GoalsSaveError(GOALS_COPY.saveFailed, true);
    rerender(<GoalsPanel userId="u1" />);
    expect(await saveButton()).toBeInTheDocument();
    expect(screen.getAllByText(GOALS_COPY.saveFailed).length).toBeGreaterThan(0);
  });

  it('an unsaved edit registers its own save with the leave guard', async () => {
    ready();
    render(<GoalsPanel userId="u1" />);
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

  it('the tab-switch handle: dirty, save and discard', async () => {
    ready();
    const ref = createRef<PanelHandle>();
    render(<GoalsPanel ref={ref} userId="u1" />);
    expect(ref.current!.dirty()).toBe(false);
    await userEvent.click(screen.getByRole('radio', { name: 'PhD' }));
    expect(ref.current!.dirty()).toBe(true);
    act(() => ref.current!.discard());
    expect(screen.getByRole('radio', { name: 'Master’s' })).toHaveAttribute('aria-checked', 'true');
    await userEvent.click(screen.getByRole('radio', { name: 'MBA' }));
    let saved = false;
    await act(async () => {
      saved = await ref.current!.save();
    });
    expect(saved).toBe(true);
    expect(mutateAsync).toHaveBeenCalledOnce();
  });

  it('a save from the bar moves focus from the bar to the first card’s heading', async () => {
    ready();
    render(<GoalsPanel userId="u1" />);
    await userEvent.click(screen.getByRole('radio', { name: 'PhD' }));
    await userEvent.click(await saveButton());
    expect(await screen.findByText(GOALS_COPY.saved)).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: GOALS_COPY.workingToward })).toHaveFocus(),
    );
  });

  it('a save asked for from outside (tab switch, leave guard) doesn’t move focus', async () => {
    ready();
    const ref = createRef<PanelHandle>();
    render(<GoalsPanel ref={ref} userId="u1" />);
    await userEvent.click(screen.getByRole('radio', { name: 'PhD' }));
    (document.activeElement as HTMLElement).blur();
    await act(async () => {
      await ref.current!.save();
    });
    await act(() => new Promise((r) => setTimeout(r, 50)));
    expect(screen.getByRole('heading', { name: GOALS_COPY.workingToward })).not.toHaveFocus();
    await userEvent.click(screen.getByRole('radio', { name: 'MBA' }));
    (document.activeElement as HTMLElement).blur();
    await act(async () => {
      await unsavedSave()!();
    });
    await act(() => new Promise((r) => setTimeout(r, 50)));
    expect(screen.getByRole('heading', { name: GOALS_COPY.workingToward })).not.toHaveFocus();
  });

  it('the degree levels fail after /me loaded: the error state with Try again, not a skeleton', () => {
    ready();
    levelsStatus = 'error';
    render(<GoalsPanel userId="u1" />);
    expect(screen.getByText(SETTINGS_COPY.loadError)).toBeInTheDocument();
    expect(screen.queryByLabelText(GOALS_COPY.loading)).toBeNull();
  });

  it('after a save, the refetched goal comes in', async () => {
    ready();
    const { rerender } = render(<GoalsPanel userId="u1" />);
    await userEvent.click(screen.getByRole('radio', { name: 'PhD' }));
    await userEvent.click(await saveButton());
    expect(await screen.findByText(GOALS_COPY.saved)).toBeInTheDocument();
    ready({ goal: goal({ field_of_study: 'Epidemiology' }) });
    rerender(<GoalsPanel userId="u1" />);
    expect(screen.getByLabelText(GOALS_COPY.field)).toHaveValue('Epidemiology');
  });

  it('only the degree missing: Save focuses the first choice', async () => {
    ready({ goal: goal({ degree_goal: null }) });
    render(<GoalsPanel userId="u1" />);
    await userEvent.type(screen.getByLabelText(GOALS_COPY.field), 's');
    await userEvent.click(await saveButton());
    await waitFor(() => expect(screen.getByRole('radio', { name: 'Bachelor’s' })).toHaveFocus());
    expect(screen.getByRole('radiogroup', { name: GOALS_COPY.applyingFor })).toHaveAttribute(
      'aria-required',
      'true',
    );
  });
});
