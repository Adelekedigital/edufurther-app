import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SessionTypeQuickEdit } from './SessionTypeQuickEdit';

const props = () => ({
  initial: { durationMin: 60, visible: true },
  fullHref: '/session-types/st1/edit',
  saving: false,
  error: null,
  onSave: vi.fn(),
  onCancel: vi.fn(),
});

describe('SessionTypeQuickEdit', () => {
  it('offers the platform lengths, names the switch, and links the full editor', () => {
    render(<SessionTypeQuickEdit {...props()} />);
    const length = screen.getByRole('combobox', { name: 'Length' });
    expect(length).toHaveValue('60');
    expect(Array.from((length as HTMLSelectElement).options, (o) => o.value)).toEqual([
      '30',
      '45',
      '60',
      '90',
    ]);
    const vis = screen.getByRole('switch', { name: 'Visible to mentees' });
    expect(vis).toBeChecked();
    expect(vis).toHaveAccessibleDescription(
      'Hidden types stay in Session types. Sessions already booked go ahead.',
    );
    expect(screen.getByRole('link', { name: /Open full editor/ })).toHaveAttribute(
      'href',
      '/session-types/st1/edit',
    );
  });

  it('sends only what changed', async () => {
    const p = props();
    const user = userEvent.setup();
    render(<SessionTypeQuickEdit {...p} />);
    await user.selectOptions(screen.getByRole('combobox', { name: 'Length' }), '90');
    await user.click(screen.getByRole('switch', { name: 'Visible to mentees' }));
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(p.onSave).toHaveBeenCalledWith({ durationMin: 90, visible: false });
  });

  it('nothing changed cancels', async () => {
    const p = props();
    const user = userEvent.setup();
    render(<SessionTypeQuickEdit {...p} />);
    await user.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(p.onCancel).toHaveBeenCalledTimes(1);
    expect(p.onSave).not.toHaveBeenCalled();
  });

  it('while saving, Save stays focusable but does nothing', async () => {
    const p = props();
    const user = userEvent.setup();
    render(<SessionTypeQuickEdit {...p} saving />);
    const save = screen.getByRole('button', { name: 'Saving…' });
    expect(save).toHaveAttribute('aria-disabled', 'true');
    await user.selectOptions(screen.getByRole('combobox', { name: 'Length' }), '30');
    await user.click(save);
    expect(p.onSave).not.toHaveBeenCalled();
  });

  it('shows why a save failed (the page’s live region says it)', () => {
    render(<SessionTypeQuickEdit {...props()} error="That didn’t save. Try again." />);
    expect(screen.getByText('That didn’t save. Try again.')).toBeVisible();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
