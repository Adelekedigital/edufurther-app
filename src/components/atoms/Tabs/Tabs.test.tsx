import { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
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

  it('a count shows as a pill and is read after the label, never as a bare number', () => {
    render(
      <Tabs
        label="Bookings"
        value="a"
        onChange={() => {}}
        items={[
          { value: 'a', label: 'Upcoming', panelId: 'pa', count: 3, countLabel: '3 upcoming' },
          { value: 'b', label: 'History', panelId: 'pb' },
        ]}
      />,
    );
    const tab = screen.getByRole('tab', { name: 'Upcoming, 3 upcoming' });
    // The pill is out of the accessibility tree, so the number is not read twice.
    expect(within(tab).getByText('3')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByRole('tab', { name: 'History' })).toBeVisible();
  });

  it('a zero count is still a count; absent draws no pill', () => {
    const { rerender } = render(
      <Tabs
        label="Bookings"
        value="a"
        onChange={() => {}}
        items={[{ value: 'a', label: 'Pending', panelId: 'pa', count: 0, countLabel: '0 waiting' }]}
      />,
    );
    expect(within(screen.getByRole('tab', { name: /Pending/ })).getByText('0')).toBeVisible();
    rerender(
      <Tabs
        label="Bookings"
        value="a"
        onChange={() => {}}
        items={[{ value: 'a', label: 'Pending', panelId: 'pa', count: null }]}
      />,
    );
    expect(screen.getByRole('tab', { name: 'Pending' }).textContent).toBe('Pending');
  });

  it('countStyle="text": "(N)" after the label, 0 included, and the tab is named as seen', () => {
    const { rerender } = render(
      <Tabs
        label="Profile"
        value="a"
        onChange={() => {}}
        countStyle="text"
        items={[{ value: 'a', label: 'Reviews', panelId: 'pa', count: 0 }]}
      />,
    );
    expect(screen.getByRole('tab', { name: 'Reviews (0)' })).toBeInTheDocument();
    rerender(
      <Tabs
        label="Profile"
        value="a"
        onChange={() => {}}
        countStyle="text"
        items={[{ value: 'a', label: 'Reviews', panelId: 'pa', count: null }]}
      />,
    );
    expect(screen.getByRole('tab', { name: 'Reviews' })).toBeInTheDocument();
  });

  it('variant pill: the same tabs, drawn as pills', () => {
    render(
      <Tabs
        variant="pill"
        label="Who gets it"
        value="mentee"
        onChange={() => {}}
        items={[
          { value: 'mentee', label: 'To the mentee', panelId: 'p-mentee' },
          { value: 'mentor', label: 'To the mentor', panelId: 'p-mentor' },
        ]}
      />,
    );
    expect(screen.getByRole('tablist', { name: 'Who gets it' }).className).toMatch(/pills/);
    expect(screen.getByRole('tab', { name: 'To the mentee', selected: true })).toBeInTheDocument();
  });

  it('a marked tab draws a dot and says why in its name', () => {
    render(
      <Tabs
        variant="pill"
        label="Who gets it"
        value="mentee"
        onChange={() => {}}
        items={[
          { value: 'mentee', label: 'To the mentee', panelId: 'p-mentee' },
          {
            value: 'mentor',
            label: 'To the mentor',
            panelId: 'p-mentor',
            marked: true,
            markLabel: 'unsaved changes',
          },
        ]}
      />,
    );
    expect(screen.getByRole('tab', { name: 'To the mentor, unsaved changes' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'To the mentee' })).not.toHaveAttribute('aria-label');
  });
});
