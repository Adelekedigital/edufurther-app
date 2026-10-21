import { render, screen } from '@testing-library/react';
import { ConfirmActions, confirmClose } from './ConfirmActions';

describe('confirmClose', () => {
  const keep = () => {};
  const dismiss = () => {};
  it('keeps when nothing is running', () => {
    expect(confirmClose(false, keep, dismiss)).toEqual({ onClose: keep, closeDisabled: false });
  });
  it('is off while the request runs', () => {
    const r = confirmClose(true, keep);
    expect(r.closeDisabled).toBe(true);
    expect(r.onClose).not.toBe(keep);
  });
  it('dismisses while the request runs, where the caller allows it', () => {
    expect(confirmClose(true, keep, dismiss)).toEqual({ onClose: dismiss, closeDisabled: false });
  });
});

describe('ConfirmActions error', () => {
  const props = {
    keepLabel: 'Keep it',
    confirmLabel: 'Delete',
    onKeep: vi.fn(),
    onConfirm: vi.fn(),
  };
  it('the alert region is there, empty, before any failure, and the failure fills it', () => {
    const { rerender } = render(<ConfirmActions {...props} />);
    const region = screen.getByRole('alert');
    expect(region).toBeEmptyDOMElement();
    rerender(<ConfirmActions {...props} error="We couldn’t delete it." />);
    expect(screen.getByRole('alert')).toBe(region);
    expect(region).toHaveTextContent('We couldn’t delete it.');
  });

  it('confirmDisabled turns confirm off, but not while it runs (busy stays focusable)', () => {
    const { rerender } = render(<ConfirmActions {...props} confirmDisabled />);
    expect(screen.getByRole('button', { name: 'Delete' })).toBeDisabled();
    rerender(<ConfirmActions {...props} confirmDisabled pending />);
    expect(screen.getByRole('button', { name: 'Delete' })).toBeEnabled();
  });
});

describe('ConfirmActions layout', () => {
  const props = {
    keepLabel: 'Keep Google Meet',
    confirmLabel: 'Switch to EduFurther video',
    onKeep: vi.fn(),
    onConfirm: vi.fn(),
  };

  /** Safe choice first, which is also the drawn order (Modal.dc.html). */
  it('puts keep before confirm by default', () => {
    render(<ConfirmActions {...props} />);
    const [first, second] = screen.getAllByRole('button');
    expect(first).toHaveAccessibleName('Keep Google Meet');
    expect(second).toHaveAccessibleName('Switch to EduFurther video');
  });

  /**
   * Stacked, the action is on top. Reading order and focus order must agree,
   * so the DOM order flips with the drawn order rather than only the CSS
   * (WCAG 1.3.2, 2.4.3). The dialog still opens focused on Keep.
   */
  it('puts the action on top when stacked, and keeps initial focus on Keep', () => {
    render(<ConfirmActions {...props} layout="stack" />);
    const [first, second] = screen.getAllByRole('button');
    expect(first).toHaveAccessibleName('Switch to EduFurther video');
    expect(second).toHaveAccessibleName('Keep Google Meet');
    expect(second).toHaveAttribute('data-autofocus');
  });
});
