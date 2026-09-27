import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tabs } from './Tabs';

function Harness() {
  const [v, setV] = useState('a');
  return (
    <Tabs
      label="Profile"
      value={v}
      onChange={setV}
      items={[
        { value: 'a', label: 'Overview', panelId: 'pa' },
        { value: 'b', label: 'Sessions', panelId: 'pb' },
        { value: 'c', label: 'Reviews', panelId: 'pc' },
      ]}
    />
  );
}

describe('Tabs', () => {
  it('is one tab stop; arrows, Home and End move focus and select', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.tab();
    const tab = (name: string) => screen.getByRole('tab', { name });
    expect(tab('Overview')).toHaveFocus();
    expect(tab('Sessions')).toHaveAttribute('tabindex', '-1');
    await user.keyboard('{ArrowRight}');
    expect(tab('Sessions')).toHaveFocus();
    expect(tab('Sessions')).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{End}');
    expect(tab('Reviews')).toHaveAttribute('aria-selected', 'true');
    await user.keyboard('{ArrowRight}');
    expect(tab('Overview')).toHaveFocus();
    await user.keyboard('{End}{Home}');
    expect(tab('Overview')).toHaveAttribute('aria-selected', 'true');
    expect(tab('Overview')).toHaveAttribute('aria-controls', 'pa');
  });
});
