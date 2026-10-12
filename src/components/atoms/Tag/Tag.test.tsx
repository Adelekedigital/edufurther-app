import { render, screen } from '@testing-library/react';
import { Tag } from './Tag';

describe('Tag', () => {
  it('is a list item when asked, keeping the caller’s class', () => {
    render(
      <ul>
        <Tag as="li" tone="fact" className="mine">
          60 min
        </Tag>
      </ul>,
    );
    expect(screen.getByRole('listitem')).toHaveClass('tag', 'fact', 'mine');
  });

  it('is a span by default', () => {
    render(<Tag tone="pending">Respond within 6h</Tag>);
    expect(screen.getByText('Respond within 6h').tagName).toBe('SPAN');
  });
});
