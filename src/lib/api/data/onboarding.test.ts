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

  it('is complete only when /me says so: filled-in answers alone never skip completion', () => {
    const full = { degree_goal: masters, field_of_study: 'Law', needs: [need] };
    // Every answer saved, but completion (and its starter credit) may never have run.
    const filled = toState(saved(full, { originCode: 'NG' }), countries);
    expect(filled.complete).toBe(false);
    expect(filled.lastStep).toBe('plans');
    expect(
      toState(
        saved(full, { originCode: 'NG', onboarding: { complete: true, missing: [] } }),
        countries,
      ).complete,
    ).toBe(true);
    const reported = saved(full, {
      originCode: 'NG',
      onboarding: { complete: false, missing: ['field'] },
    });
    expect(toState(reported, countries).complete).toBe(false);
  });
});

describe('toState — migrated mentees (PRD H5)', () => {
  it('is unfinished on complete: false alone, even with nothing missing, as sign-in reads it', () => {
    // Sign-in routes on the same flag, so the two can never bounce a mentee between them.
    expect(
      toState(saved({ needs: [need] }, { onboarding: { complete: false, missing: [] } }), countries)
        .complete,
    ).toBe(false);
  });

  const brought = { needs: [need], degree_goal: masters };

  it('is migrated when the server has no step for them but they hold answers', () => {
    const s = toState(
      saved(brought, { onboarding: { complete: false, missing: ['origin'], last_step: null } }),
      countries,
    );
    expect(s).toMatchObject({ lastStep: null, migrated: true });
  });

  it('is not migrated once they step through here, or with nothing brought over', () => {
    expect(
      toState(
        saved(brought, { onboarding: { complete: false, missing: [], last_step: 'help' } }),
        countries,
      ),
    ).toMatchObject({ lastStep: 'help', migrated: false });
    expect(
      toState(
        saved(null, { onboarding: { complete: false, missing: ['help'], last_step: null } }),
        countries,
      ).migrated,
    ).toBe(false);
  });

  it('reads the step from the answers, never migrated, while the server sends no last_step', () => {
    const s = toState(
      saved(brought, { onboarding: { complete: false, missing: ['origin'] } }),
      countries,
    );
    expect(s).toMatchObject({ lastStep: 'help', migrated: false });
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

describe('toState — a mentor application step (B3 shares last_step)', () => {
  it('reads as no mentee step known: the answers decide, never "migrated"', () => {
    const none = toState(
      saved(null, { onboarding: { complete: false, missing: [], last_step: 'mentor_hours' } }),
      countries,
    );
    expect(none).toMatchObject({ lastStep: null, migrated: false });
    const answered = toState(
      saved(
        { needs: [need] },
        { onboarding: { complete: false, missing: ['origin'], last_step: 'mentor_hours' } },
      ),
      countries,
    );
    expect(answered).toMatchObject({ lastStep: 'help', migrated: false });
  });
});
