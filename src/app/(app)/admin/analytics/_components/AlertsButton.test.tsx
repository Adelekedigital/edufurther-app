import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AnalyticsAlert } from '@/lib/api/data/adminAnalytics';
import { AlertsButton } from './AlertsButton';

const alert = (over: Partial<AnalyticsAlert> = {}): AnalyticsAlert => ({
  key: 'no_signups',
  title: 'No sign-ups',
  body: 'No one has signed up in the last 24 hours.',
  link: { tab: 'funnels', funnel: 'signup' },
  ...over,
});

describe('AlertsButton', () => {
  it('renders nothing with no alerts', () => {
    const { container } = render(<AlertsButton alerts={[]} onOpen={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('names the count and says whether the list is open', async () => {
    render(<AlertsButton alerts={[alert()]} onOpen={vi.fn()} />);
    const button = screen.getByRole('button', { name: '1 alert' });
    expect(button).toHaveAttribute('aria-haspopup', 'dialog');
    expect(button).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(button).toHaveAttribute('aria-controls', screen.getByRole('dialog').id);
  });

  it('Escape closes the list and puts focus back on the count', async () => {
    render(<AlertsButton alerts={[alert()]} onOpen={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: '1 alert' }));
    expect(screen.getByRole('dialog', { name: 'Alerts' })).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('button', { name: '1 alert' })).toHaveFocus();
  });

  it('a click outside closes it; the count toggles it', async () => {
    render(
      <>
        <AlertsButton alerts={[alert()]} onOpen={vi.fn()} />
        <p>elsewhere</p>
      </>,
    );
    const button = screen.getByRole('button', { name: '1 alert' });
    await userEvent.click(button);
    await userEvent.click(screen.getByText('elsewhere'));
    expect(screen.queryByRole('dialog')).toBeNull();
    await userEvent.click(button);
    await userEvent.click(button);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('tabbing out of the list closes it', async () => {
    render(
      <>
        <AlertsButton alerts={[alert()]} onOpen={vi.fn()} />
        <button type="button">next</button>
      </>,
    );
    await userEvent.click(screen.getByRole('button', { name: '1 alert' }));
    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'See the sign-up funnel' })).toHaveFocus();
    await userEvent.tab();
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('button', { name: 'next' })).toHaveFocus();
  });

  it('a link opens its view and closes the list', async () => {
    const onOpen = vi.fn();
    render(<AlertsButton alerts={[alert()]} onOpen={onOpen} />);
    await userEvent.click(screen.getByRole('button', { name: '1 alert' }));
    await userEvent.click(screen.getByRole('button', { name: 'See the sign-up funnel' }));
    expect(onOpen).toHaveBeenCalledWith({ tab: 'funnels', funnel: 'signup' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('button', { name: '1 alert' })).toHaveFocus();
  });

  it('an alert without a link keeps its words and has no button', async () => {
    render(<AlertsButton alerts={[alert({ link: null })]} onOpen={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: '1 alert' }));
    const item = within(screen.getByRole('dialog')).getByRole('listitem');
    expect(item).toHaveTextContent('No sign-ups');
    expect(within(item).queryByRole('button')).toBeNull();
  });
});
