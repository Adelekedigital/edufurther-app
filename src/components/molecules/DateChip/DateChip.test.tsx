import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DateChip } from './DateChip';

describe('DateChip', () => {
  it('reads the month and day in the viewer’s zone', () => {
    // 23:30 UTC on Oct 4 is already Oct 5 in Lagos (UTC+1).
    const { container } = render(<DateChip iso="2026-10-04T23:30:00Z" timeZone="Africa/Lagos" />);
    expect(container.textContent).toContain('Oct5');
    expect(container.textContent).toContain('October 5, 2026');
  });

  it('gives assistive tech the full date, not the tile', () => {
    const { container } = render(<DateChip iso="2026-10-04T12:00:00Z" timeZone="UTC" />);
    const hidden = [...container.querySelectorAll('[aria-hidden="true"]')].map(
      (e) => e.textContent,
    );
    expect(hidden).toEqual(['Oct', '4']);
    expect(container.querySelector('.sr-only')).toHaveTextContent('October 4, 2026');
  });
});
