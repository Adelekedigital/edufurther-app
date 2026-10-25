import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { KpiCard } from './KpiCard';

describe('KpiCard', () => {
  it('shows a value, unit and trend', () => {
    render(
      <KpiCard
        label="Hours of guidance"
        value="9"
        unit="hrs"
        trend={{ text: '+1.5 hrs this month', icon: 'trending_up', tone: 'positive' }}
      />,
    );
    expect(screen.getByText('9')).toBeInTheDocument();
    expect(screen.getByText('hrs')).toBeInTheDocument();
    expect(screen.getByText('+1.5 hrs this month')).toBeInTheDocument();
  });

  it('shows "No data yet" for a null value, and hides the unit', () => {
    render(<KpiCard label="Hours of guidance" value={null} unit="hrs" />);
    expect(screen.getByText('No data yet')).toBeInTheDocument();
    expect(screen.queryByText('hrs')).not.toBeInTheDocument();
  });

  it('a link with an href is a page link', () => {
    render(
      <KpiCard
        label="Missed · 90 days"
        value="1"
        link={{ label: 'View missed', href: '/bookings?tab=history&filter=missed' }}
      />,
    );
    expect(screen.getByRole('link', { name: 'View missed' })).toHaveAttribute(
      'href',
      '/bookings?tab=history&filter=missed',
    );
  });

  it('colours the figure by valueTone, but never the "No data yet" line', () => {
    const { rerender } = render(<KpiCard label="Missed" value="2" valueTone="danger" />);
    expect(screen.getByText('2').className).toMatch(/danger/);
    rerender(<KpiCard label="Missed" value={null} valueTone="danger" />);
    expect(screen.getByText('No data yet').className).not.toMatch(/danger/);
  });

  it('calls the link handler', async () => {
    const onClick = vi.fn();
    render(<KpiCard label="Mentors met" value="8" link={{ label: 'View mentors', onClick }} />);
    await userEvent.click(screen.getByRole('button', { name: 'View mentors' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('shows an info tooltip on the label when given (Mentor Dashboard)', async () => {
    const hint = 'Sessions marked complete since you joined';
    render(<KpiCard label="Sessions completed" value="2" info={hint} />);
    const trigger = screen.getByRole('button', { name: hint });
    // Closed until asked — not a hover-only native title this time.
    expect(screen.queryByText(hint)).not.toBeInTheDocument();
    await userEvent.hover(trigger);
    expect(screen.getByText(hint)).toBeVisible();
  });
});
