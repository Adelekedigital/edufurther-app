import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchField } from './SearchField';

function Host({ labelled, radius }: { labelled?: boolean; radius?: 'sm' }) {
  const [q, setQ] = useState('');
  return (
    <SearchField
      labelled={labelled}
      radius={radius}
      label="Find a mentee"
      placeholder="Email, name or user ID"
      value={q}
      onChange={setQ}
      onClear={() => setQ('')}
    />
  );
}

describe('SearchField', () => {
  it('by default: a search landmark, the label for screen readers, a leading glyph', () => {
    render(<Host />);
    expect(screen.getByRole('search')).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: 'Find a mentee' })).toBeInTheDocument();
    expect(screen.getByText('Find a mentee')).toHaveClass('sr-only');
    expect(screen.getByText('search')).toHaveAttribute('aria-hidden', 'true');
  });

  it('labelled: the label shows and no glyph leads', () => {
    render(<Host labelled />);
    expect(screen.getByRole('searchbox', { name: 'Find a mentee' })).toBeInTheDocument();
    expect(screen.getByText('Find a mentee')).not.toHaveClass('sr-only');
    expect(screen.queryByText('search')).toBeNull();
  });

  it('radius sm reaches the field; without it the size keeps its own corners', () => {
    const { unmount } = render(<Host labelled radius="sm" />);
    expect(screen.getByRole('searchbox').className).toMatch(/radiusSm/);
    unmount();
    render(<Host labelled />);
    expect(screen.getByRole('searchbox').className).not.toMatch(/radiusSm/);
  });

  it.each([false, true])(
    'labelled=%s: × clears the text and keeps focus in the field',
    async (labelled) => {
      render(<Host labelled={labelled} />);
      const box = screen.getByRole('searchbox');
      await userEvent.type(box, 'ama');
      await userEvent.click(screen.getByRole('button', { name: 'Clear search' }));
      expect(box).toHaveValue('');
      expect(box).toHaveFocus();
    },
  );
});
