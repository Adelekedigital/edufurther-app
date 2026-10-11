import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ReasonField, reasonError, reasonsFor } from './ReasonField';

const field = (props: Partial<Parameters<typeof ReasonField>[0]> = {}) =>
  render(
    <ReasonField
      side="mentee"
      reasonCode={null}
      onReasonCode={vi.fn()}
      text=""
      onText={vi.fn()}
      readerFirstName="Amara"
      {...props}
    />,
  );

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
    expect(reasonsFor('mentor').map((r) => r.value).sort()).toEqual(
      ['mentor_unavailable', 'other', 'scheduling_conflict', 'technical_issue'],
    );
    expect(reasonsFor('mentee').map((r) => r.value).sort()).toEqual(
      ['mentee_no_longer_needed', 'other', 'scheduling_conflict', 'technical_issue'],
    );
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
    expect(
      reasonError({ reasonCode: null, text: '', required: true, suggesting: true }),
    ).toBe(null);
  });

  it('nothing blocks when the reason is not required', () => {
    expect(reasonError({ reasonCode: null, text: '' })).toBe(null);
  });
});

describe('what the field shows', () => {
  it('drops the Optional tag on the reason, but not on the note', () => {
    // The note stays optional beside a coded reason: only "Something else"
    // makes it necessary.
    field({ required: true });
    expect(screen.getByText('Why?').textContent).not.toContain('Optional');
    expect(screen.getByText(/Add a note/).textContent).toContain('Optional');
  });

  it('keeps it when optional, and the note stays optional too', () => {
    field();
    expect(screen.getAllByText('Optional').length).toBe(2);
  });

  it('the note becomes required, and is relabelled, only alongside Other', () => {
    field({ required: true, reasonCode: 'other' });
    expect(screen.getByLabelText('What happened?')).toBeRequired();
  });

  it('a coded reason leaves the note optional even when the reason is required', () => {
    field({ required: true, reasonCode: 'technical_issue' });
    expect(screen.getByLabelText(/Add a note/)).not.toBeRequired();
  });

  it('the error is tied to the control at fault', async () => {
    field({
      required: true,
      reasonCode: 'other',
      error: { field: 'note', message: 'Say briefly what happened.' },
    });
    const note = screen.getByLabelText('What happened?');
    expect(note).toHaveAttribute('aria-invalid', 'true');
    expect(note.getAttribute('aria-describedby')).toContain('note-err');
    expect(screen.getByText('Say briefly what happened.')).toBeVisible();
  });

  it('a reason error describes the chip group, which carries no aria-invalid', () => {
    // The chips are buttons in a role="group"; aria-invalid means nothing there.
    field({ required: true, error: { field: 'reason', message: 'Pick a reason before you go on.' } });
    const group = screen.getByRole('group', { name: 'Reason' });
    expect(group).not.toHaveAttribute('aria-invalid');
    expect(group.getAttribute('aria-describedby')).toContain('reason-err');
  });

  it('still says who reads the note', async () => {
    field({ required: true, reasonCode: 'other' });
    expect(screen.getByText('Amara will read this.')).toBeVisible();
  });

  it('picking Other is one click away from typing', async () => {
    const onReasonCode = vi.fn();
    field({ required: true, onReasonCode });
    await userEvent.click(screen.getByRole('button', { name: 'Something else' }));
    expect(onReasonCode).toHaveBeenCalledWith('other');
  });
});
