import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RadioCards } from './RadioCards';

function Harness() {
  const [v, setV] = useState<'default' | 'custom'>('default');
  return (
    <RadioCards
      label="Hours for this session"
      value={v}
      onChange={setV}
      options={[
        { value: 'default', label: 'Use my Calendar availability', description: 'Weekly hours.' },
        { value: 'custom', label: 'Set dedicated hours', description: 'Its own times.' },
      ]}
    />
  );
}

describe('RadioCards', () => {
  it('the whole card selects, and arrows move between cards', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const group = screen.getByRole('radiogroup', { name: 'Hours for this session' });
    expect(group).toBeInTheDocument();
    await user.click(screen.getByText('Its own times.'));
    expect(screen.getByRole('radio', { name: /Set dedicated hours/ })).toBeChecked();
    await user.keyboard('{ArrowUp}');
    expect(screen.getByRole('radio', { name: /Use my Calendar availability/ })).toBeChecked();
  });
});
