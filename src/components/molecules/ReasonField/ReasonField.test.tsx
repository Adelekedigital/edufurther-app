import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ReasonField } from './ReasonField';

// The rules themselves — which codes each side may send, and what blocks a
// submit — live in `lib/utils/reasons` and are tested there.

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

describe('the box belongs to Other, and nowhere else', () => {
  it('no box at all before anything is picked', () => {
    // Four chips, not a form. An optional box beside them invited typing that
    // only repeated the chip.
    field({ required: true });
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('no box on a coded reason either', () => {
    field({ required: true, reasonCode: 'technical_issue' });
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('the box appears for Other, labelled and required', () => {
    field({ required: true, reasonCode: 'other' });
    expect(screen.getByLabelText('What happened?')).toBeRequired();
  });

  it('the box appears for Other even when the reason itself is optional, but is not required', () => {
    // A mentor offering another time instead is exempt — they may still want
    // to say something, and picking "Something else" with nowhere to say it
    // would be a dead end.
    field({ reasonCode: 'other' });
    expect(screen.getByLabelText(/What happened\?/)).not.toBeRequired();
  });

  it('counts characters only once there is something to count', async () => {
    field({ required: true, reasonCode: 'other', text: 'visa refused' });
    expect(screen.getByText('12 / 2000')).toBeVisible();
  });
});

describe('what the field says about who reads it', () => {
  it('a picked chip reaches them as a sentence, not as the chip', () => {
    field({ required: true, reasonCode: 'technical_issue' });
    expect(screen.getByText('Amara will be told why.')).toBeVisible();
  });

  it('Other reaches them as their own words, and says so', () => {
    field({ required: true, reasonCode: 'other' });
    expect(screen.getByText('Amara will read what you write.')).toBeVisible();
  });

  it('the hint sits in one place, so nothing shifts when the box appears', () => {
    const { rerender } = field({ required: true });
    expect(screen.getAllByText(/Amara will/)).toHaveLength(1);
    rerender(
      <ReasonField
        side="mentee"
        reasonCode="other"
        onReasonCode={vi.fn()}
        text=""
        onText={vi.fn()}
        readerFirstName="Amara"
        required
      />,
    );
    // Still exactly one: the box adds a label and a field, never a second hint.
    expect(screen.getAllByText(/Amara will/)).toHaveLength(1);
    expect(screen.getByRole('textbox')).toBeVisible();
  });
});

describe('what the field shows', () => {
  it('drops the Optional tag when the reason is required', () => {
    field({ required: true });
    expect(screen.getByText(/^Why\?/).textContent).not.toContain('Optional');
  });

  it('keeps it when the reason is optional', () => {
    field();
    expect(screen.getByText(/^Why\?/).textContent).toContain('Optional');
  });

  it('the error is tied to the control at fault', () => {
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
    field({
      required: true,
      error: { field: 'reason', message: 'Pick a reason before you go on.' },
    });
    const group = screen.getByRole('group', { name: 'Reason' });
    expect(group).not.toHaveAttribute('aria-invalid');
    expect(group.getAttribute('aria-describedby')).toContain('reason-err');
  });

  it('picking Other is one click away from typing', async () => {
    const onReasonCode = vi.fn();
    field({ required: true, onReasonCode });
    await userEvent.click(screen.getByRole('button', { name: 'Something else' }));
    expect(onReasonCode).toHaveBeenCalledWith('other');
  });
});
