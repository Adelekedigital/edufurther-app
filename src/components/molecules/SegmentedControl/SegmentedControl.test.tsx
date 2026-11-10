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

  it('track look: an icon-only segment is named by its label, and the trailing slot sits outside the radiogroup', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <SegmentedControl
        look="track"
        size="sm"
        label="Chart type"
        value="bar"
        onChange={onChange}
        options={[
          { value: 'bar', label: 'Bar chart', icon: 'bar_chart', iconOnly: true },
          { value: 'line', label: 'Line chart', icon: 'show_chart', iconOnly: true },
        ]}
        trailing={<button type="button">Year</button>}
      />,
    );
    const group = screen.getByRole('radiogroup', { name: 'Chart type' });
    const line = screen.getByRole('radio', { name: 'Line chart' });
    expect(line).toHaveAttribute('title', 'Line chart');
    expect(line).not.toHaveTextContent('Line chart');
    expect(group).not.toContainElement(screen.getByRole('button', { name: 'Year' }));
    await user.click(line);
    expect(onChange).toHaveBeenCalledWith('line');
  });

  it('size and trailing exist only on the track look (type check)', () => {
    const base = {
      label: 'Price',
      value: 'free' as const,
      onChange: () => {},
      options: [{ value: 'free' as const, label: 'Free' }],
    };
    render(
      <>
        {/* @ts-expect-error size is track-only */}
        <SegmentedControl {...base} size="lg" />
        {/* @ts-expect-error trailing is track-only */}
        <SegmentedControl {...base} look="outline" trailing={<span />} />
        <SegmentedControl {...base} look="track" size="lg" trailing={<span />} />
      </>,
    );
    expect(screen.getAllByRole('radiogroup', { name: 'Price' })).toHaveLength(3);
  });

  it('track look keeps the keyboard model', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <SegmentedControl
        look="track"
        size="lg"
        label="Time window"
        value="30d"
        onChange={onChange}
        options={[
          { value: '7d', label: '7 days' },
          { value: '30d', label: '30 days' },
          { value: '90d', label: '90 days' },
        ]}
      />,
    );
    await user.tab();
    expect(screen.getByRole('radio', { name: '30 days' })).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenLastCalledWith('90d');
    expect(screen.getByRole('radio', { name: '90 days' })).toHaveFocus();
  });
});
