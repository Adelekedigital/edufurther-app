import { render, screen } from '@testing-library/react';
import { StatTile } from './StatTile';

describe('StatTile', () => {
  it('a known figure shows as the value', () => {
    render(<StatTile icon="groups" tone="blue" value="27" label="mentees mentored" />);
    expect(screen.getByText('27')).toHaveClass('value');
    expect(screen.getByText('27')).not.toHaveClass('empty');
  });

  it('an unknown figure keeps the tile, muted "No data yet", never 0', () => {
    render(<StatTile icon="event_available" tone="green" value={null} label="attendance" />);
    expect(screen.getByText('No data yet')).toHaveClass('value', 'empty');
    expect(screen.queryByText('0')).toBeNull();
  });
});
