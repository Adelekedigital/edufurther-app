import { describe, expect, it } from 'vitest';
import { NOT_SURE } from '@/lib/copy/onboarding';
import { LevelMissingError, goalBody, toState, type Saved } from './onboarding';

const countries = [
  { id: 'c-gb', label: 'United Kingdom', code: 'GB' },
  { id: 'c-ng', label: 'Nigeria', code: 'NG' },
];
const masters = { id: 'dl-masters', code: 'masters', display_name: 'Masters' };
const levels = [
  { id: 'dl-bachelors', code: 'bachelors' },
  { id: 'dl-masters', code: 'masters' },
];
const need = { id: 'o1', code: 'x', display_name: 'X' };

const saved = (
  goal: Partial<NonNullable<Saved['goal']>> | null,
  over: Partial<Saved> = {},
): Saved => ({
  goal: goal && ({ id: 'g1', countries: [], needs: [], ...goal } as NonNullable<Saved['goal']>),
  originCode: null,
  onboarding: null,
  ...over,
});

describe('toState', () => {
  it('reads a member who never started as step 1, not complete', () => {
    expect(toState(saved(null), countries)).toMatchObject({
      lastStep: null,
      complete: false,
      needIds: [],
    });
  });

  it('resumes after the help areas', () => {
    expect(toState(saved({ needs: [need] }), countries)).toMatchObject({
      lastStep: 'help',
      needIds: ['o1'],
      complete: false,
    });
  });

  it('turns Master’s with raw "MBA" back into MBA, and maps the goal country by code', () => {
    const s = toState(
      saved({
        degree_goal: masters,
        degree_goal_raw: 'MBA',
        field_of_study: 'Law',
        countries: [{ code: 'GB', display_name: 'United Kingdom', priority: 1 }],
      }),
      countries,
    );
    expect(s.plans).toEqual({ originId: '', degree: 'mba', field: 'Law', destinationId: 'c-gb' });
    expect(s.lastStep).toBe('plans');
  });

  it('reads answered plans with no country as "Not sure yet"', () => {
    const s = toState(saved({ degree_goal: masters, field_of_study: 'Law' }), countries);
    expect(s.plans.destinationId).toBe(NOT_SURE);
  });

  it('trusts /me onboarding when it is there, else the PRD B3 rule', () => {
    const full = { degree_goal: masters, field_of_study: 'Law', needs: [need] };
    expect(toState(saved(full, { originCode: 'NG' }), countries).complete).toBe(true);
    expect(toState(saved(full), countries).complete).toBe(false);
    const reported = saved(full, {
      originCode: 'NG',
      onboarding: { complete: false, missing: ['field'] },
    });
    expect(toState(reported, countries).complete).toBe(false);
  });
});

describe('goalBody', () => {
  const plans = (over = {}) => ({
    originId: 'c-ng',
    degree: 'mba',
    field: ' Law ',
    destinationId: NOT_SURE,
    ...over,
  });
  const done = saved({
    target_start_term: '2027 Fall',
    notes: 'n',
    degree_goal: masters,
    degree_goal_raw: 'MBA',
    field_of_study: 'Law',
    countries: [
      { code: 'GB', display_name: 'United Kingdom', priority: 1 },
      { code: 'NG', display_name: 'Nigeria', priority: 2 },
    ],
  });

  it('step 1 carries every saved answer forward: PUT replaces, so nothing is wiped', () => {
    expect(goalBody(done, { needIds: ['o1'] }, levels, countries)).toEqual({
      target_start_term: '2027 Fall',
      notes: 'n',
      need_ids: ['o1'],
      degree_goal_id: 'dl-masters',
      degree_goal_raw: 'MBA',
      // In priority order; field_of_study omitted = unchanged.
      country_ids: ['c-gb', 'c-ng'],
    });
  });

  it('stores MBA as Master’s plus the raw word', () => {
    expect(goalBody(null, { needIds: ['o1'], plans: plans() }, levels, countries)).toMatchObject({
      degree_goal_id: 'dl-masters',
      degree_goal_raw: 'MBA',
      field_of_study: 'Law',
      country_ids: [],
    });
  });

  it('step 2 replaces the first country and keeps the others', () => {
    const body = goalBody(
      done,
      { needIds: ['o1'], plans: plans({ destinationId: 'c-ng' }) },
      levels,
      countries,
    );
    expect(body.country_ids).toEqual(['c-ng']);
    const keep = goalBody(
      done,
      { needIds: ['o1'], plans: plans({ destinationId: NOT_SURE }) },
      levels,
      countries,
    );
    expect(keep.country_ids).toEqual(['c-ng']);
  });

  it('never saves a chosen degree as none when the level list lacks it', () => {
    expect(() =>
      goalBody(null, { needIds: ['o1'], plans: plans({ degree: 'doctorate' }) }, levels, countries),
    ).toThrow(LevelMissingError);
  });
});
