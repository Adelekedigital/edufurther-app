import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DateChip } from './DateChip';

describe('DateChip', () => {
  it('reads the month and day in the viewer’s zone', () => {
    // 23:30 UTC on Oct 4 is already Oct 5 in Lagos (UTC+1).
    const { container } = render(<DateChip iso="2026-10-04T23:30:00Z" timeZone="Africa/Lagos" />);
    expect(container.textContent).toBe('Oct5');
  });

  it('is hidden from assistive tech', () => {
    const { container } = render(<DateChip iso="2026-10-04T12:00:00Z" timeZone="UTC" />);
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
  });
});
