import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { GOALS_COPY } from '@/lib/copy/settings';
import type { MenteeGoalValues } from '@/types/settings';
import { goalsBody, toGoalValues, useSaveGoals, type GoalsRead } from './goals';
import { keys } from './keys';

const calls: { method: string; path: string; body: unknown }[] = [];
let failPut = false;
const res = (status: number) => Promise.resolve({ response: new Response(null, { status }) });
vi.mock('./http', () => ({
  api: {
    PATCH: (path: string, init: { body: unknown }) => {
      calls.push({ method: 'PATCH', path, body: init.body });
      return res(200);
    },
    PUT: (path: string, init: { body: unknown }) => {
      calls.push({ method: 'PUT', path, body: init.body });
      return res(failPut ? 500 : 200);
    },
  },
}));

const countries = [
  { id: 'c-ng', label: 'Nigeria', code: 'NG' },
  { id: 'c-gb', label: 'United Kingdom', code: 'GB' },
  { id: 'c-ca', label: 'Canada', code: 'CA' },
];
const levels = [
  { id: 'l-m', code: 'masters' },
  { id: 'l-d', code: 'doctorate' },
];
const values: MenteeGoalValues = {
  degree: 'mba',
  field: ' Business ',
  countryIds: ['c-gb', 'c-ca'],
  schools: [
    { institutionId: 'inst-1', raw: 'University of Lagos', label: 'University of Lagos' },
    { institutionId: null, raw: 'Lagos Business School', label: 'Lagos Business School' },
  ],
  needIds: ['o1'],
};
const read = (goal: GoalsRead['goal'] = null): GoalsRead => ({
  goal,
});

beforeEach(() => {
  calls.length = 0;
  failPut = false;
});

describe('toGoalValues', () => {
  it('maps codes to catalogue ids, by priority; schools by position; MBA back to "mba"', () => {
    const v = toGoalValues(
      {
        goal: {
          id: 'g',
          degree_goal: { id: 'l-m', code: 'masters', display_name: 'Master’s' },
          degree_goal_raw: 'MBA',
          field_of_study: 'Business',
          countries: [
            { code: 'CA', display_name: 'Canada', priority: 2 },
            { code: 'GB', display_name: 'United Kingdom', priority: 1 },
          ],
          needs: [{ id: 'o1', code: 'x', display_name: 'X' }],
          schools: [
            { id: 's2', school_name_raw: 'Typed', position: 2, institution_id: null },
            {
              id: 's1',
              school_name_raw: 'uni of lagos',
              position: 1,
              institution_id: 'inst-1',
              institution_name: 'University of Lagos',
            },
          ],
        },
      },
      countries,
    );
    expect(v).toEqual({
      degree: 'mba',
      field: 'Business',
      countryIds: ['c-gb', 'c-ca'],
      needIds: ['o1'],
      schools: [
        { institutionId: 'inst-1', raw: 'uni of lagos', label: 'University of Lagos' },
        { institutionId: null, raw: 'Typed', label: 'Typed' },
      ],
    });
  });

  it('where they’re from is not a goal value (it lives on Profile)', () => {
    expect(toGoalValues(read(), countries)).not.toHaveProperty('originId');
  });
});

describe('goalsBody', () => {
  it('MBA as Master’s + raw "MBA", the trimmed field, the lists, and schools as written', () => {
    expect(
      goalsBody({
        after: values,
        goal: { target_start_term: '2027', notes: 'n' } as GoalsRead['goal'],
        levels,
      }),
    ).toEqual({
      target_start_term: '2027',
      notes: 'n',
      degree_goal_id: 'l-m',
      degree_goal_raw: 'MBA',
      field_of_study: 'Business',
      country_ids: ['c-gb', 'c-ca'],
      need_ids: ['o1'],
      schools: [
        { institution_id: 'inst-1', school_name_raw: 'University of Lagos' },
        { institution_id: null, school_name_raw: 'Lagos Business School' },
      ],
    });
  });

  it('"Not sure yet": no countries goes out as country_ids: [], not left out', () => {
    const body = goalsBody({
      after: { ...values, countryIds: [] },
      goal: null,
      levels,
    });
    expect(body).toHaveProperty('country_ids', []);
    expect(body.need_ids).toEqual(['o1']);
  });
});

describe('useSaveGoals', () => {
  const setup = () => {
    const qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
    const spy = vi.spyOn(qc, 'invalidateQueries');
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useSaveGoals('u1'), { wrapper });
    return { result, spy };
  };

  it('writes only the goal (never the profile); refreshes the viewer and the matches', async () => {
    const { result, spy } = setup();
    await result.current.mutateAsync({ after: values, goal: null, levels });
    expect(calls.map((c) => c.method)).toEqual(['PUT']);
    expect(calls[0]!.path).toBe('/api/v1/users/{user_id}/goal');
    const invalidated = spy.mock.calls.map((c) => c[0]?.queryKey);
    expect(invalidated).toContainEqual(keys.viewer.all);
    expect(invalidated).toContainEqual(keys.onboarding.all);
    // matchesAll sits under onboarding.all.
    expect(keys.onboarding.matchesAll.slice(0, 1)).toEqual(keys.onboarding.all);
  });

  it('a failure says so in our words', async () => {
    failPut = true;
    const { result } = setup();
    await expect(
      result.current.mutateAsync({ after: values, goal: null, levels }),
    ).rejects.toMatchObject({ copy: GOALS_COPY.saveFailed });
  });

  it('a degree the catalogue can’t place writes nothing', async () => {
    const { result } = setup();
    await expect(
      result.current.mutateAsync({
        after: values,
        goal: null,
        levels: [{ id: 'l-d', code: 'doctorate' }],
      }),
    ).rejects.toMatchObject({ copy: GOALS_COPY.saveFailed });
    expect(calls).toEqual([]);
  });
});
