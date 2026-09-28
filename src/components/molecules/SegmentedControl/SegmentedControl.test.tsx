import { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SegmentedControl } from './SegmentedControl';

function Harness() {
  const [v, setV] = useState<'a' | 'b' | 'c'>('a');
  return (
    <SegmentedControl
      label="Session length"
      value={v}
      onChange={setV}
      options={[
        { value: 'a', label: '30 min' },
        { value: 'b', label: '45 min' },
        { value: 'c', label: '60 min' },
      ]}
    />
  );
}

describe('SegmentedControl', () => {
  it('is one tab stop; arrows, Home and End move focus and select', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    expect(screen.getByRole('radiogroup', { name: 'Session length' })).toBeInTheDocument();
    const radio = (name: string) => screen.getByRole('radio', { name });
    await user.tab();
    expect(radio('30 min')).toHaveFocus();
    expect(radio('45 min')).toHaveAttribute('tabindex', '-1');
    await user.keyboard('{ArrowRight}');
    expect(radio('45 min')).toHaveFocus();
    expect(radio('45 min')).toHaveAttribute('aria-checked', 'true');
    await user.keyboard('{End}');
    expect(radio('60 min')).toHaveAttribute('aria-checked', 'true');
    await user.keyboard('{ArrowRight}');
    expect(radio('30 min')).toHaveAttribute('aria-checked', 'true');
    await user.keyboard('{ArrowLeft}');
    expect(radio('60 min')).toHaveFocus();
  });

  it('with no matching value, the first segment still takes the tab stop', async () => {
    const user = userEvent.setup();
    render(
      <SegmentedControl
        label="Answer type"
        value={'' as 'text' | 'file'}
        onChange={vi.fn()}
        options={[
          { value: 'text', label: 'Short answer' },
          { value: 'file', label: 'File upload' },
        ]}
      />,
    );
    await user.tab();
    expect(screen.getByRole('radio', { name: 'Short answer' })).toHaveFocus();
  });
});
