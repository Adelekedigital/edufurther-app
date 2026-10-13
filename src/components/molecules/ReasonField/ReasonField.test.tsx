import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ReasonField } from './ReasonField';

// The rules themselves — which codes each side may send, and what blocks a
// submit — live in `lib/utils/reasons` and are tested there.

// The dialog's words, not the field's: it is mounted per action, so the label
// and placeholder arrive from whichever one is open.
const LABEL = 'Reason for canceling';
const PLACEHOLDER = 'Tell Amara what happened';

const field = (props: Partial<Parameters<typeof ReasonField>[0]> = {}) =>
  render(
    <ReasonField
      side="mentee"
      label={LABEL}
      placeholder={PLACEHOLDER}
      reasonCode={null}
      onReasonCode={vi.fn()}
      text=""
      onText={vi.fn()}
      readerFirstName="Amara"
      {...props}
    />,
  );

describe('the box belongs to Other, and nowhere else', () => {
  it('no box at all before anything is picked', () => {
    // Four chips, not a form. An optional box beside them invited typing that
    // only repeated the chip.
    field();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('no box on a coded reason either', () => {
    field({ reasonCode: 'technical_issue' });
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('the box appears for Other, labelled and required', () => {
    // Required wherever it appears: there is no optional path left, because
    // "Something else" reaches the other party saying nothing on its own.
    field({ reasonCode: 'other' });
    expect(screen.getByLabelText('What happened?')).toBeRequired();
  });

  it('counts characters only once there is something to count', () => {
    field({ reasonCode: 'other', text: 'visa refused' });
    expect(screen.getByText('12 / 2000')).toBeVisible();
  });
});

describe('what the field says about who reads it', () => {
  it('a picked chip reaches them as a sentence, not as the chip', () => {
    field({ reasonCode: 'technical_issue' });
    expect(screen.getByText('Amara sees the reason you pick.')).toBeVisible();
  });

  it('Other reaches them as their own words, and says so', () => {
    field({ reasonCode: 'other' });
    expect(screen.getByText('Amara reads what you write.')).toBeVisible();
  });

  it('the hint sits in one place, so nothing shifts when the box appears', () => {
    const { rerender } = field();
    expect(screen.getAllByText(/Amara (sees|reads)/)).toHaveLength(1);
    rerender(
      <ReasonField
        side="mentee"
        label={LABEL}
        placeholder={PLACEHOLDER}
        reasonCode="other"
        onReasonCode={vi.fn()}
        text=""
        onText={vi.fn()}
        readerFirstName="Amara"
      />,
    );
    // Still exactly one: the box adds a label and a field, never a second hint.
    expect(screen.getAllByText(/Amara (sees|reads)/)).toHaveLength(1);
    expect(screen.getByRole('textbox')).toBeVisible();
  });
});

describe('what the field shows', () => {
  it("the caller's label is both the visible one and the group's name", () => {
    // One string in two places. Two would mean a screen reader is read a name
    // nobody else can see — and the action would go stale in one of them.
    field();
    expect(screen.getByText(LABEL)).toBeVisible();
    expect(screen.getByRole('group', { name: LABEL })).toBeInTheDocument();
  });

  it('says nothing about Optional, because the field is only shown when required', () => {
    // A mentor offering another time instead is exempt from giving a reason,
    // and the dialog answers that by not mounting this field at all.
    field({ reasonCode: 'other' });
    expect(screen.queryByText(/Optional/i)).not.toBeInTheDocument();
  });

  it("the caller's placeholder lands on the box", () => {
    field({ reasonCode: 'other' });
    expect(screen.getByPlaceholderText(PLACEHOLDER)).toBe(screen.getByRole('textbox'));
  });

  it('the error is tied to the control at fault', () => {
    field({
      reasonCode: 'other',
      error: { field: 'note', message: 'Say briefly what happened.' },
    });
    const note = screen.getByLabelText('What happened?');
    expect(note).toHaveAttribute('aria-invalid', 'true');
    expect(note.getAttribute('aria-describedby')).toContain('note-err');
    expect(screen.getByText('Say briefly what happened.')).toBeVisible();
  });

  it('the chip group points at the hint, error or no error', () => {
    // Without this, dropping `${id}-hint` from describedBy fails nothing: the
    // person reading by ear would choose a chip without being told what the
    // other party gets from it.
    const { rerender } = field();
    const hintId = screen.getByText('Amara sees the reason you pick.').id;
    expect(hintId).toBeTruthy();
    expect(screen.getByRole('group', { name: LABEL }).getAttribute('aria-describedby')).toContain(
      hintId,
    );
    rerender(
      <ReasonField
        side="mentee"
        label={LABEL}
        placeholder={PLACEHOLDER}
        reasonCode={null}
        onReasonCode={vi.fn()}
        text=""
        onText={vi.fn()}
        readerFirstName="Amara"
        error={{ field: 'reason', message: 'Pick a reason before you go on.' }}
      />,
    );
    // The error is added to the hint, never swapped in for it.
    const described = screen.getByRole('group', { name: LABEL }).getAttribute('aria-describedby');
    expect(described).toContain(hintId);
    expect(described).toContain('reason-err');
  });

  it('a reason error describes the chip group, which carries no aria-invalid', () => {
    // The chips are buttons in a role="group"; aria-invalid means nothing there.
    field({ error: { field: 'reason', message: 'Pick a reason before you go on.' } });
    const group = screen.getByRole('group', { name: LABEL });
    expect(group).not.toHaveAttribute('aria-invalid');
    expect(group.getAttribute('aria-describedby')).toContain('reason-err');
  });

  it('picking Other is one click away from typing', async () => {
    const onReasonCode = vi.fn();
    field({ onReasonCode });
    await userEvent.click(screen.getByRole('button', { name: 'Something else' }));
    expect(onReasonCode).toHaveBeenCalledWith('other');
  });
});
