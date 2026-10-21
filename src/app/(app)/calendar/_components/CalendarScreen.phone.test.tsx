import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { emptyWeek } from '@/lib/utils/sessionTypeDraft';
import { CalendarScreen } from './CalendarScreen';
import {
  h,
  HOURS,
  monday,
  remote,
  resetCalendar,
  shortMonday,
  tuesdaySwitch,
} from './calendarScreen.harness';

// The data hooks, mocked (hoisted above the imports; state lives in the harness).
vi.mock('next/navigation', async () =>
  (await import('./calendarScreen.harness')).mocks.navigation(),
);
// The setup lock's flags, switchable per test (lockedPage.harness).
vi.mock('@/lib/config/auth', async (orig) =>
  (await import('@/app/_shell/lockedPage.harness')).authFlags(await orig()),
);
vi.mock('@/app/_shell/useAppShell', async () =>
  (await import('./calendarScreen.harness')).mocks.appShell(),
);
vi.mock('@/lib/api/data/weeklyHours', async () =>
  (await import('./calendarScreen.harness')).mocks.weeklyHours(),
);
vi.mock('@/lib/api/data/sessionTypes', async () =>
  (await import('./calendarScreen.harness')).mocks.sessionTypes(),
);
vi.mock('@/lib/api/data/mentorStatus', async () =>
  (await import('./calendarScreen.harness')).mocks.mentorStatus(),
);
vi.mock('@/lib/api/data/conferencing', async () =>
  (await import('./calendarScreen.harness')).mocks.conferencing(),
);
vi.mock('@/lib/api/data/calendar', async () =>
  (await import('./calendarScreen.harness')).mocks.calendar(),
);

vi.mock('@/lib/api/data/calendarConnection', async () =>
  (await import('./calendarScreen.harness')).mocks.calendarConnection(),
);

beforeEach(resetCalendar);

describe('CalendarScreen: weekly availability on a phone (mobileCollapse=on)', () => {
  beforeEach(() => {
    vi.spyOn(window, 'matchMedia').mockImplementation(
      (query: string) =>
        ({
          media: query,
          matches: query === '(max-width: 767px)',
          addEventListener: () => {},
          removeEventListener: () => {},
        }) as unknown as MediaQueryList,
    );
  });
  afterEach(() => vi.restoreAllMocks());

  const header = () => screen.getByRole('button', { name: 'Weekly availability' });

  it('starts closed with the summary and the weekly total, and opens on a tap', async () => {
    render(<CalendarScreen />);
    expect(header()).toHaveAttribute('aria-expanded', 'false');
    expect(header()).toHaveAccessibleDescription('3 hrs a week Mon · 5 pm–8 pm. Tap to view');
    expect(screen.queryByRole('switch', { name: 'Tuesday' })).toBeNull();
    await userEvent.click(header());
    expect(header()).toHaveAttribute('aria-expanded', 'true');
    expect(tuesdaySwitch()).toBeVisible();
  });

  it('an edit turns the chip to Unsaved, and the save bar stays while it’s closed', async () => {
    const user = userEvent.setup();
    render(<CalendarScreen />);
    await user.click(header());
    await user.click(tuesdaySwitch());
    expect(screen.getByText('Unsaved')).toBeInTheDocument();
    await user.click(header());
    expect(header()).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('region', { name: 'Unsaved changes' })).toBeInTheDocument();
  });

  it('opens by itself with no hours, chip Not set', () => {
    h.weekly = remote({ ...HOURS, days: emptyWeek() });
    render(<CalendarScreen />);
    expect(header()).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Not set')).toBeInTheDocument();
  });

  it('opens by itself when the hours are invalid, chip Fix hours', () => {
    const days = emptyWeek();
    days[1] = { on: true, slots: [[1200, 1020]] };
    h.weekly = remote({ ...HOURS, days });
    render(<CalendarScreen />);
    expect(header()).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Fix hours')).toBeInTheDocument();
  });

  it('opened by itself with no hours, it stays open as the first day goes on', async () => {
    h.weekly = remote({ ...HOURS, days: emptyWeek() });
    const user = userEvent.setup();
    render(<CalendarScreen />);
    const mondaySwitch = screen.getByRole('switch', { name: 'Monday' });
    await user.click(mondaySwitch);
    expect(header()).toHaveAttribute('aria-expanded', 'true');
    expect(mondaySwitch).toHaveFocus();
  });

  it('opened by itself for invalid hours, it stays open once they’re fixed', async () => {
    const days = monday();
    days[2] = { on: true, slots: [[1200, 1020]] };
    h.weekly = remote({ ...HOURS, days });
    const user = userEvent.setup();
    render(<CalendarScreen />);
    expect(header()).toHaveAttribute('aria-expanded', 'true');
    await user.click(tuesdaySwitch());
    expect(screen.queryByText('Fix hours')).toBeNull();
    expect(header()).toHaveAttribute('aria-expanded', 'true');
    expect(tuesdaySwitch()).toHaveFocus();
  });

  it('closed while the hours need fixing, going busy opens it to show them', async () => {
    h.weekly = remote({ ...HOURS, days: shortMonday() });
    const user = userEvent.setup();
    render(<CalendarScreen />);
    await user.click(tuesdaySwitch());
    await user.click(header());
    expect(header()).toHaveAttribute('aria-expanded', 'false');
    await user.click(screen.getByRole('switch', { name: 'Available for new bookings' }));
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Weekly availability' })).toHaveFocus(),
    );
    expect(header()).toHaveAttribute('aria-expanded', 'true');
    expect(tuesdaySwitch()).toBeVisible();
  });

  it('the settings rows show an edit icon, named for what it edits', () => {
    render(<CalendarScreen />);
    expect(screen.getByRole('button', { name: 'Edit booking rules' })).not.toHaveTextContent(
      'Change',
    );
    expect(screen.getByRole('button', { name: 'Change video for sessions' })).not.toHaveTextContent(
      'Change',
    );
  });
});

describe('CalendarScreen: weekly availability on desktop', () => {
  it('never collapses', () => {
    render(<CalendarScreen />);
    expect(screen.queryByRole('button', { name: 'Weekly availability' })).toBeNull();
    expect(screen.getByRole('heading', { level: 2, name: 'Weekly availability' })).toBeVisible();
    expect(tuesdaySwitch()).toBeVisible();
    expect(screen.getByRole('button', { name: 'Edit booking rules' })).toHaveTextContent('Change');
  });
});
