import { render, screen, within } from '@testing-library/react';
import { toSessions, type Sessions } from '@/lib/api/data/adminAnalytics';
import { mockSection, mockWindow } from '@/lib/api/mock/adminAnalytics';
import { isSessionsEmpty, SessionsTab } from './SessionsTab';

const data = (compare = true): Sessions =>
  toSessions(mockSection('sessions', mockWindow({ compare: String(compare) })!, false));

describe('SessionsTab', () => {
  it('shows the eight KPIs with their signed changes', () => {
    render(<SessionsTab data={data()} compare />);
    const section = screen.getByRole('region', { name: 'Sessions' });
    expect(within(section).getByText('Database')).toBeInTheDocument();
    const card = (label: string) => within(section).getByText(label).parentElement!;
    expect(card('Acceptance rate')).toHaveTextContent('84%+2 pts');
    // Median time to reply fell from 7.1 to 6.2 hours: good.
    expect(card('Median time to reply')).toHaveTextContent('6.2 h−12.7%');
    // Reports went 1 → 2: shown as a difference.
    expect(card('Reports')).toHaveTextContent('2+1');
    expect(card('Average rating')).toHaveTextContent('4.8No change');
  });

  it('shows how requests end, with the top no-show reason in our words', () => {
    render(<SessionsTab data={data()} compare />);
    expect(screen.getByText('Completed').nextSibling!.firstChild).toHaveAttribute(
      'title',
      expect.stringMatching(/^Completed: 71% of requests \(\d+\)$/),
    );
    expect(
      screen.getByText(
        /Share of requests made in this period\. Top no-show reason: “Forgot the time” \(41%\)\./,
      ),
    ).toBeInTheDocument();
  });

  it('marks each guardrail Worse or Better, lower being better', () => {
    render(<SessionsTab data={data()} compare />);
    const g = screen.getByRole('region', { name: 'Guardrails' });
    expect(within(g).getByText('+0.9 pts · Worse')).toBeInTheDocument();
    expect(within(g).getByText('−0.4 pts · Better')).toBeInTheDocument();
    expect(within(g).getByText('6.8%')).toBeInTheDocument();
  });

  it('with Compare off shows no change lines', () => {
    render(<SessionsTab data={data(false)} compare={false} />);
    expect(screen.queryByText(/pts/)).toBeNull();
    expect(screen.queryByText('No change')).toBeNull();
  });

  it('is empty only when every KPI and guardrail is empty', () => {
    const d = data();
    const zero = { value: 0, previous: 2 };
    const noRequests = {
      ...d,
      kpis: { ...d.kpis, requests: zero, reports: zero },
      outcomes: { ...d.outcomes, requests: 0 },
    };
    // No new request, but sessions booked earlier were completed and reviewed.
    expect(isSessionsEmpty(noRequests)).toBe(false);
    const kpis = Object.fromEntries(Object.keys(d.kpis).map((k) => [k, zero])) as typeof d.kpis;
    const guardrails = Object.fromEntries(
      Object.keys(d.guardrails).map((k) => [k, { value: null, previous: null }]),
    ) as typeof d.guardrails;
    expect(isSessionsEmpty({ ...noRequests, kpis, guardrails })).toBe(true);
  });

  it('a flat guardrail reads "No change" once, with no verdict', () => {
    const d = data();
    render(
      <SessionsTab
        data={{ ...d, guardrails: { ...d.guardrails, noShowRate: { value: 6.8, previous: 6.8 } } }}
        compare
      />,
    );
    const g = screen.getByRole('region', { name: 'Guardrails' });
    expect(within(g).getByText('No change')).toBeInTheDocument();
    expect(within(g).queryByText(/No change · No change/)).toBeNull();
  });
});
