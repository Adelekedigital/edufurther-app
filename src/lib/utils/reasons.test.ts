import { describe, expect, it } from 'vitest';
import { reasonError, reasonReads, reasonsFor } from './reasons';

describe('the reasons offered depend on the side, not the action', () => {
  it('a mentee is never offered the mentor-only code', () => {
    // The server 422s it, so offering it would be a trap.
    const vals = reasonsFor('mentee').map((r) => r.value);
    expect(vals).not.toContain('mentor_unavailable');
    expect(vals).toContain('mentee_no_longer_needed');
  });

  it('a mentor is never offered the mentee-only code', () => {
    const vals = reasonsFor('mentor').map((r) => r.value);
    expect(vals).not.toContain('mentee_no_longer_needed');
    expect(vals).toContain('mentor_unavailable');
  });

  it('the two lists are exactly the codes the server accepts from that side', () => {
    // The backend's `_MENTOR_REASONS` / `_MENTEE_REASONS` (confirmed
    // 2026-10-10). Anything else from that side is a 422 reading "<code> is
    // not a reason you may give for <action>", so this is the list that must
    // not drift. Sorted: the order on screen is the field's business, not the
    // server's. Membership in the contract's enum is checked at compile time
    // where the request body is built.
    expect(
      reasonsFor('mentor')
        .map((r) => r.value)
        .sort(),
    ).toEqual(['mentor_unavailable', 'other', 'scheduling_conflict', 'technical_issue']);
    expect(
      reasonsFor('mentee')
        .map((r) => r.value)
        .sort(),
    ).toEqual(['mentee_no_longer_needed', 'other', 'scheduling_conflict', 'technical_issue']);
  });

  it('three plus Other for each, with Other last', () => {
    // The backend asked for Other last; three real reasons is the owner's call.
    for (const side of ['mentee', 'mentor'] as const) {
      const vals = reasonsFor(side).map((r) => r.value);
      expect(vals).toHaveLength(4);
      expect(vals[3]).toBe('other');
    }
  });
});

describe('what the other party reads is not the chip they picked', () => {
  it('every offered code reads as something, except Other', () => {
    // The point of requiring a chip: with the box hidden, this sentence is the
    // only thing that reaches the other party.
    for (const side of ['mentee', 'mentor'] as const) {
      for (const r of reasonsFor(side)) {
        if (r.value === 'other') expect(r.reads).toBe(null);
        else expect(r.reads?.length).toBeGreaterThan(0);
      }
    }
  });

  it('never repeats the chip label, which is written in the first person', () => {
    // "I'm no longer free" in a line headed "Reason from Amara" would read as
    // Amara talking about herself in someone else's panel.
    for (const side of ['mentee', 'mentor'] as const) {
      for (const r of reasonsFor(side)) {
        expect(r.reads).not.toBe(r.label);
      }
    }
  });

  it('carries no pronoun — we are never told anyone’s', () => {
    for (const side of ['mentee', 'mentor'] as const) {
      for (const r of reasonsFor(side)) {
        expect(r.reads ?? '').not.toMatch(/\b(he|she|him|her|his|hers|they|them|their)\b/i);
      }
    }
  });

  it('reads a code the backend sets itself as nothing, rather than inventing one', () => {
    // Five of the nine are system-set. A phrase for `admin_action` would be
    // worse than silence.
    expect(reasonReads('admin_action')).toBe(null);
    expect(reasonReads('mentee_no_show')).toBe(null);
    expect(reasonReads('other')).toBe(null);
    expect(reasonReads(null)).toBe(null);
    expect(reasonReads('scheduling_conflict')).toBe('A calendar clash.');
  });
});

describe('reasonError is the single definition of what blocks a submit', () => {
  it('nothing picked, when required', () => {
    expect(reasonError({ reasonCode: null, text: '', required: true })?.field).toBe('reason');
  });

  it('Other with an empty box blocks on the note, not the reason', () => {
    const e = reasonError({ reasonCode: 'other', text: '', required: true });
    expect(e?.field).toBe('note');
  });

  it('Other with only whitespace still blocks', () => {
    expect(reasonError({ reasonCode: 'other', text: '   \n ', required: true })?.field).toBe('note');
  });

  it('Other with any real text passes — no length floor', () => {
    // A floor invites "asdf" and punishes a true short answer.
    expect(reasonError({ reasonCode: 'other', text: 'visa refused', required: true })).toBe(null);
  });

  it('a coded reason needs no note', () => {
    expect(reasonError({ reasonCode: 'technical_issue', text: '', required: true })).toBe(null);
  });

  it('a mentor offering another time is exempt', () => {
    expect(reasonError({ reasonCode: null, text: '', required: true, suggesting: true })).toBe(null);
  });

  it('nothing blocks when the reason is not required', () => {
    expect(reasonError({ reasonCode: null, text: '' })).toBe(null);
  });
});
