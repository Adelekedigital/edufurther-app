import type { ReactNode } from 'react';

/**
 * The phone sheet's chrome (BookingModal.dc.html `mobileView=sheet`): a 44px
 * control on the left (close on the first step, back after), a centred step
 * caption and name, and close on the right once back has taken the left slot.
 */
export type SheetChrome = {
  caption?: string;
  heading: string;
  leading: { icon: 'close' | 'arrow_back'; label: string; onClick: () => void };
  showClose: boolean;
  /** Sits under the header and does not scroll (step bars). */
  progress?: ReactNode;
};
