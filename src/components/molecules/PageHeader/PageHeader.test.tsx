import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { PageHeader } from './PageHeader';

describe('PageHeader', () => {
  it('renders the page h1 and a text subtitle as a paragraph', () => {
    render(<PageHeader title="Integrations" subtitle="Connect your calendar." />);
    expect(screen.getByRole('heading', { level: 1, name: 'Integrations' })).toBeInTheDocument();
    expect(screen.getByText('Connect your calendar.').tagName).toBe('P');
  });

  it('puts a control in the subtitle slot as is, never inside a paragraph', () => {
    render(<PageHeader title="Bookings" subtitle={<button type="button">Lagos (WAT)</button>} />);
    expect(screen.getByRole('button', { name: 'Lagos (WAT)' }).closest('p')).toBeNull();
  });

  it('keeps the title aside out of the heading name', () => {
    render(<PageHeader title="Sessions" titleAside={<span>2 of 5</span>} />);
    expect(screen.getByRole('heading', { level: 1, name: 'Sessions' })).toBeInTheDocument();
    expect(screen.getByText('2 of 5')).toBeInTheDocument();
  });

  it('marks the header busy only while loading, and forwards its ref', () => {
    const ref = createRef<HTMLElement>();
    const { rerender } = render(<PageHeader ref={ref} title="Settings" busy />);
    expect(ref.current).toHaveAttribute('aria-busy', 'true');
    rerender(<PageHeader ref={ref} title="Settings" />);
    expect(ref.current).not.toHaveAttribute('aria-busy');
  });
});
