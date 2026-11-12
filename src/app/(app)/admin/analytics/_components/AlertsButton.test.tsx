import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AnalyticsAlert } from '@/lib/api/data/adminAnalytics';
import { AlertsButton } from './AlertsButton';

const alert = (over: Partial<AnalyticsAlert> = {}): AnalyticsAlert => ({
  key: 'no_signups',
  title: 'No sign-ups',
  body: 'No one has signed up in the last 7 days.',
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

  it('alerts clearing while the list is open: it stays shut when the next one fires', async () => {
    const { rerender } = render(<AlertsButton alerts={[alert()]} onOpen={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: '1 alert' }));
    rerender(<AlertsButton alerts={[]} onOpen={vi.fn()} />);
    expect(screen.queryByRole('button')).toBeNull();
    rerender(<AlertsButton alerts={[alert()]} onOpen={vi.fn()} />);
    expect(screen.getByRole('button', { name: '1 alert' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it.each([
    ['desktop', false],
    ['phones', true],
  ])('%s: alerts clearing while the list has focus send it to the fallback', async (_, phone) => {
    const mq = vi.spyOn(window, 'matchMedia').mockImplementation(
      (q: string) =>
        ({
          matches: phone,
          media: q,
          addEventListener: () => {},
          removeEventListener: () => {},
        }) as unknown as MediaQueryList,
    );
    const Page = ({ alerts }: { alerts: AnalyticsAlert[] }) => (
      <>
        <AlertsButton
          alerts={alerts}
          onOpen={vi.fn()}
          fallbackFocus={() => document.getElementById('tab')}
        />
        <button id="tab" type="button">
          Overview
        </button>
      </>
    );
    const { rerender } = render(<Page alerts={[alert()]} />);
    await userEvent.click(screen.getByRole('button', { name: '1 alert' }));
    expect(screen.getByRole('dialog')).toContainElement(document.activeElement as HTMLElement);
    rerender(<Page alerts={[]} />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Overview' })).toHaveFocus());
    mq.mockRestore();
  });

  it('a click outside leaves focus where it landed, not on the count', async () => {
    render(
      <>
        <AlertsButton alerts={[alert()]} onOpen={vi.fn()} />
        <input aria-label="elsewhere" />
      </>,
    );
    await userEvent.click(screen.getByRole('button', { name: '1 alert' }));
    await userEvent.click(screen.getByRole('textbox', { name: 'elsewhere' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByRole('textbox', { name: 'elsewhere' })).toHaveFocus();
  });

  it('Shift+Tab back to the count keeps the list open', async () => {
    render(<AlertsButton alerts={[alert()]} onOpen={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: '1 alert' }));
    await userEvent.tab({ shift: true });
    expect(screen.getByRole('button', { name: '1 alert' })).toHaveFocus();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('alerts clearing with the list shut and focus on the count send it to the fallback', async () => {
    const Page = ({ alerts }: { alerts: AnalyticsAlert[] }) => (
      <>
        <AlertsButton
          alerts={alerts}
          onOpen={vi.fn()}
          fallbackFocus={() => document.getElementById('tab')}
        />
        <button id="tab" type="button">
          Overview
        </button>
      </>
    );
    const { rerender } = render(<Page alerts={[alert()]} />);
    // Opened and closed with Escape: focus is back on the count.
    await userEvent.click(screen.getByRole('button', { name: '1 alert' }));
    await userEvent.keyboard('{Escape}');
    expect(screen.getByRole('button', { name: '1 alert' })).toHaveFocus();
    rerender(<Page alerts={[]} />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Overview' })).toHaveFocus());
  });

  it('alerts clearing while focus is elsewhere leave it there', async () => {
    const Page = ({ alerts }: { alerts: AnalyticsAlert[] }) => (
      <>
        <AlertsButton
          alerts={alerts}
          onOpen={vi.fn()}
          fallbackFocus={() => document.getElementById('tab')}
        />
        <button id="tab" type="button">
          Overview
        </button>
        <input aria-label="search" />
      </>
    );
    const { rerender } = render(<Page alerts={[alert()]} />);
    await userEvent.click(screen.getByRole('button', { name: '1 alert' }));
    await userEvent.click(screen.getByRole('textbox', { name: 'search' }));
    rerender(<Page alerts={[]} />);
    await new Promise((r) => setTimeout(r, 10));
    expect(screen.getByRole('textbox', { name: 'search' })).toHaveFocus();
  });

  it('focus left for nothing focusable: a later clear does not pull it to the fallback', async () => {
    const Page = ({ alerts }: { alerts: AnalyticsAlert[] }) => (
      <>
        <AlertsButton
          alerts={alerts}
          onOpen={vi.fn()}
          fallbackFocus={() => document.getElementById('tab')}
        />
        <button id="tab" type="button">
          Overview
        </button>
        <p>plain text</p>
      </>
    );
    const { rerender } = render(<Page alerts={[alert()]} />);
    const count = screen.getByRole('button', { name: '1 alert' });
    count.focus();
    await userEvent.click(screen.getByText('plain text'));
    expect(count).not.toHaveFocus();
    rerender(<Page alerts={[]} />);
    await new Promise((r) => setTimeout(r, 10));
    expect(screen.getByRole('button', { name: 'Overview' })).not.toHaveFocus();
  });

  it.each([
    ['desktop', false],
    ['phones', true],
  ])(
    '%s: the focused alert resolving while others fire sends focus to the list',
    async (_, phone) => {
      const mq = vi.spyOn(window, 'matchMedia').mockImplementation(
        (q: string) =>
          ({
            matches: phone,
            media: q,
            addEventListener: () => {},
            removeEventListener: () => {},
          }) as unknown as MediaQueryList,
      );
      const sessions = alert({
        key: 'no_booking_requests',
        title: 'No booking requests',
        link: { tab: 'sessions' },
      });
      const { rerender } = render(<AlertsButton alerts={[sessions, alert()]} onOpen={vi.fn()} />);
      await userEvent.click(screen.getByRole('button', { name: '2 alerts' }));
      screen.getByRole('button', { name: 'See sessions' }).focus();
      rerender(<AlertsButton alerts={[alert()]} onOpen={vi.fn()} />);
      await waitFor(() => expect(screen.getByRole('dialog', { name: 'Alerts' })).toHaveFocus());
      expect(screen.queryByRole('button', { name: 'See sessions' })).toBeNull();
      mq.mockRestore();
    },
  );

  it('another alert resolving leaves focus on the link it was on', async () => {
    const sessions = alert({
      key: 'no_booking_requests',
      title: 'No booking requests',
      link: { tab: 'sessions' },
    });
    const { rerender } = render(<AlertsButton alerts={[sessions, alert()]} onOpen={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: '2 alerts' }));
    const link = screen.getByRole('button', { name: 'See the sign-up funnel' });
    link.focus();
    rerender(<AlertsButton alerts={[alert()]} onOpen={vi.fn()} />);
    await new Promise((r) => setTimeout(r, 10));
    expect(screen.getByRole('button', { name: 'See the sign-up funnel' })).toHaveFocus();
  });

  it('an alert without a link keeps its words and has no button', async () => {
    render(<AlertsButton alerts={[alert({ link: null })]} onOpen={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: '1 alert' }));
    const item = within(screen.getByRole('dialog')).getByRole('listitem');
    expect(item).toHaveTextContent('No sign-ups');
    expect(within(item).queryByRole('button')).toBeNull();
  });
});
