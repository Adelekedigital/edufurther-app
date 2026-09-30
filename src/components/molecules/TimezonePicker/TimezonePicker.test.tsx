import { render, screen } from '@testing-library/react';
import { TimezonePicker } from './TimezonePicker';

describe('TimezonePicker', () => {
  it('names its button by the zone and what it does, with no stray space', () => {
    render(<TimezonePicker value="Africa/Lagos" onChange={vi.fn()} deviceZone="Africa/Lagos" />);
    const button = screen.getByRole('button', { name: /change time zone$/ });
    // One accessible name, as Chrome reads it: "Lagos (WAT), change time zone".
    expect(button).toHaveAttribute(
      'aria-label',
      expect.stringMatching(/^\S.*\S, change time zone$/),
    );
    expect(button.getAttribute('aria-label')).not.toMatch(/ ,/);
  });
});
