import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CardHeader } from './CardHeader';

describe('CardHeader', () => {
  it('is an h2 by default, with its id, the action and the sub-line', () => {
    render(
      <CardHeader
        id="h"
        title="Education"
        sub="Where you studied"
        action={<button type="button">Add</button>}
      />,
    );
    const heading = screen.getByRole('heading', { level: 2, name: 'Education' });
    expect(heading).toHaveAttribute('id', 'h');
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument();
    expect(screen.getByText('Where you studied')).toBeInTheDocument();
  });

  it('renders an h3 at level="h3" and the ref lands on the heading', () => {
    const ref = createRef<HTMLHeadingElement>();
    render(<CardHeader id="h" title="Next session" level="h3" headingRef={ref} />);
    const heading = screen.getByRole('heading', { level: 3, name: 'Next session' });
    expect(ref.current).toBe(heading);
    expect(heading).toHaveAttribute('tabindex', '-1');
  });
});
