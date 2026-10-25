import { render, screen } from '@testing-library/react';
import type { MentorDashboard, MentorStage } from '@/lib/api/data/dashboard';
import { viewers } from '@/app/_shell/lockedPage.harness';
import { DashboardScreen } from './DashboardScreen';

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn() }) }));
vi.mock('@/app/_shell/useAppShell', () => ({
  useAppShell: () => ({
    viewer: viewers.mentorApproved,
    member: viewers.mentorApproved,
    chrome: 'member',
  }),
}));
vi.mock('@/app/_shell/useSetupDetour', () => ({ useSetupDetour: () => null }));
vi.mock('@/app/_shell/useCalendarReconnect', () => ({
  useCalendarReconnect: () => ({ show: false }),
}));
vi.mock('./ApprovedToast', () => ({ ApprovedToast: () => null }));
// Each section has its own tests; here only which ones the stage shows.
vi.mock('./NewMentorHero', () => ({
  NewMentorHero: ({ stage }: { stage: string }) => <div data-testid="hero">{stage}</div>,
}));
vi.mock('./KpiGrid', () => ({ KpiGrid: () => <div data-testid="kpis" /> }));
vi.mock('./PerformanceSection', () => ({ PerformanceSection: () => <div data-testid="chart" /> }));
vi.mock('./SessionQuality', () => ({ SessionQuality: () => <div data-testid="quality" /> }));
vi.mock('./NextSessionCard', () => ({ NextSessionCard: () => <div data-testid="next" /> }));

let dash: MentorDashboard;
vi.mock('@/lib/api/data/dashboard', () => ({ useMentorDashboard: () => dash }));

const remote = { data: null, isLoading: false, error: null, retry: vi.fn() };
function make(stage: MentorStage | null, over: Partial<MentorDashboard> = {}, stepsLeft = true) {
  dash = {
    isLoading: false,
    error: null,
    retry: vi.fn(),
    metrics: [],
    nextSession: remote,
    upcomingCount: 0,
    stage,
    data: {
      isNew: stage !== 'active',
      firstName: 'Gbenga',
      shareUrl: 'https://edufurther.com/mentors/gbenga',
      shareName: 'Gbenga Adeyemi',
      profileHref: '/mentors/gbenga',
      listed: true,
      approvedAt: null,
      setup: {
        doneCount: 3,
        total: 4,
        pct: 75,
        next: stepsLeft
          ? {
              key: 'google',
              title: 'Connect Google Calendar',
              action: { label: 'Connect', href: '/integrations' },
            }
          : null,
      },
    },
    ...over,
  };
}

const banner = () => screen.queryByRole('region', { name: 'Account setup' });

describe('DashboardScreen stages (PRD Mentor Home)', () => {
  it('noBookings: the hero under the setup banner, no KPIs, chart or quality', () => {
    make('noBookings');
    render(<DashboardScreen />);
    expect(screen.getByText('Let’s get your first session booked.')).toBeInTheDocument();
    expect(banner()).toBeInTheDocument();
    expect(screen.getByTestId('hero')).toHaveTextContent('noBookings');
    // The banner sits above the hero.
    expect(banner()!.compareDocumentPosition(screen.getByTestId('hero'))).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    );
    for (const id of ['kpis', 'chart', 'quality', 'next'])
      expect(screen.queryByTestId(id)).toBeNull();
  });

  it('firstBooked: its own subline and hero; no banner once setup is done', () => {
    make('firstBooked', {}, false);
    render(<DashboardScreen />);
    expect(screen.getByText('Your first session is coming up.')).toBeInTheDocument();
    expect(screen.getByTestId('hero')).toHaveTextContent('firstBooked');
    expect(banner()).toBeNull();
  });

  it('notReady: the header and setup banner only, never told they are live', () => {
    make('notReady');
    render(<DashboardScreen />);
    expect(screen.getByRole('heading', { name: 'Welcome back, Gbenga' })).toBeInTheDocument();
    expect(banner()).toBeInTheDocument();
    for (const id of ['hero', 'kpis', 'chart', 'quality', 'next'])
      expect(screen.queryByTestId(id)).toBeNull();
  });

  it('active: KPIs, next session, chart and quality, no hero or banner', () => {
    make('active', {}, false);
    render(<DashboardScreen />);
    expect(screen.getByText('Here’s how your mentoring is going.')).toBeInTheDocument();
    for (const id of ['kpis', 'next', 'chart', 'quality'])
      expect(screen.getByTestId(id)).toBeInTheDocument();
    expect(screen.queryByTestId('hero')).toBeNull();
  });

  it('stage pending on bookings: a loading hero, not a guess', () => {
    make(null, { nextSession: { ...remote, isLoading: true } });
    render(<DashboardScreen />);
    expect(screen.getByText('Loading your bookings')).toBeInTheDocument();
    expect(screen.queryByTestId('hero')).toBeNull();
  });

  it('bookings failed: says so where the hero goes, with a retry', () => {
    const retry = vi.fn();
    make(null, {
      nextSession: { ...remote, error: { status: 500, message: 'x' } as never, retry },
    });
    render(<DashboardScreen />);
    expect(screen.getByRole('alert')).toHaveTextContent('We couldn’t load your bookings.');
    screen.getByRole('button', { name: 'Try again' }).click();
    expect(retry).toHaveBeenCalled();
  });
});
