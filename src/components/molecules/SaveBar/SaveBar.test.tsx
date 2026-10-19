import { render, screen } from '@testing-library/react';
import { SaveBar } from './SaveBar';

const props = {
  label: 'Unsaved changes',
  message: 'Unsaved changes to your profile',
  discardLabel: 'Discard',
  saveLabel: 'Save changes',
  savingLabel: 'Saving…',
  onDiscard: () => {},
  onSave: () => {},
};

describe('SaveBar', () => {
  it('the alert is there before any error, so the error is heard when it arrives', () => {
    const { rerender } = render(<SaveBar {...props} />);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('');
    rerender(<SaveBar {...props} error="Fill in the required fields to continue." />);
    expect(screen.getByRole('alert')).toBe(alert);
    expect(alert).toHaveTextContent('Fill in the required fields to continue.');
  });

  it('saving: says so and holds both buttons', () => {
    render(<SaveBar {...props} saving />);
    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Discard' })).toBeDisabled();
  });
});
