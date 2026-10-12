import { confirmClose } from './ConfirmActions';

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
