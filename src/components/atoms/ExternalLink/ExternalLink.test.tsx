import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ExternalLink } from './ExternalLink';

describe('ExternalLink', () => {
  it('opens a new tab and says so in its name', () => {
    render(<ExternalLink href="https://example.org" label="Terms of use" className="x" />);
    const link = screen.getByRole('link', { name: 'Terms of use (opens in a new tab)' });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(link).toHaveClass('x');
    expect(link).toHaveTextContent('Terms of use');
  });

  it('draws what it is given, the name staying the label', () => {
    render(
      <ExternalLink href="/settings/booking" label="Settings">
        Settings ↗
      </ExternalLink>,
    );
    expect(screen.getByRole('link', { name: 'Settings (opens in a new tab)' })).toHaveTextContent(
      'Settings ↗',
    );
  });

  it('with newTab off, a same-tab link named by its content', () => {
    render(<ExternalLink href="/home" label="Home" newTab={false} />);
    const link = screen.getByRole('link', { name: 'Home' });
    expect(link).not.toHaveAttribute('target');
    expect(link).not.toHaveAttribute('rel');
  });

  it('passes the ref and click handler through: menus move focus and close with them', async () => {
    const ref = createRef<HTMLAnchorElement>();
    const onClick = vi.fn((e: { preventDefault: () => void }) => e.preventDefault());
    render(<ExternalLink ref={ref} href="https://example.org" label="Help" onClick={onClick} />);
    expect(ref.current).toBe(screen.getByRole('link'));
    await userEvent.click(screen.getByRole('link'));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
