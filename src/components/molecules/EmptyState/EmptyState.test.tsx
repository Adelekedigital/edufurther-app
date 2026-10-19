import { render, screen } from '@testing-library/react';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
  it('with an icon: the ringed disc, no illustration, and the heading level asked for', () => {
    const { container } = render(
      <EmptyState icon="lock" title="Bookings isn’t available" headingLevel={1} size={120} />,
    );
    expect(container.querySelector('img')).toBeNull();
    const disc = container.querySelector('[class*="icon"]');
    expect(disc).not.toBeNull();
    // The glyph is decorative: the title carries the meaning.
    expect(disc!.querySelector('[aria-hidden="true"]')).toHaveTextContent('lock');
    expect(
      screen.getByRole('heading', { level: 1, name: 'Bookings isn’t available' }),
    ).toBeInTheDocument();
  });

  it('with an illustration: a decorative image at the size given, h2 by default', () => {
    const { container } = render(<EmptyState illustration="calendar" title="No hours" size={96} />);
    const img = container.querySelector('img')!;
    expect(img).toHaveAttribute('src', '/illustrations/calendar.svg');
    expect(img).toHaveAttribute('alt', '');
    expect(img).toHaveAttribute('width', '96');
    expect(screen.getByRole('heading', { level: 2, name: 'No hours' })).toBeInTheDocument();
  });
});
