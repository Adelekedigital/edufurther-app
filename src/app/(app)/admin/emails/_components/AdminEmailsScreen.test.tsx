import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockEmailList, mockEmailValues } from '@/lib/api/mock/adminEmails';
import { admin, renderScreen, res } from '../../_test/adminHarness';

// The router mock moves the query string, and listeners re-render the screen,
// as a real `router.replace` does.
const h = vi.hoisted(() => ({
  GET: vi.fn(),
  params: new URLSearchParams(),
  listeners: new Set<() => void>(),
}));
vi.mock('@/lib/api/data/http', () => ({ api: { GET: h.GET } }));
vi.mock('@/lib/api/data/viewer', () => ({ useViewer: () => admin() }));
vi.mock('next/navigation', async () => {
  const { useSyncExternalStore } = await import('react');
  const subscribe = (fn: () => void) => {
    h.listeners.add(fn);
    return () => h.listeners.delete(fn);
  };
  return {
    useSearchParams: () => useSyncExternalStore(subscribe, () => h.params),
    useRouter: () => ({ replace }),
    usePathname: () => '/admin/emails',
  };
});
const replace = vi.fn((url: string) => {
  h.params = new URLSearchParams(url.split('?')[1] ?? '');
  h.listeners.forEach((fn) => fn());
});

const { AdminEmailsScreen } = await import('./AdminEmailsScreen');

type Answer = () => unknown;
const list = () => res({ data: mockEmailList(), next_cursor: null });
function serve(over: { emails?: Answer; values?: Answer } = {}) {
  h.GET.mockImplementation(async (path: string) => {
    if (path === '/api/v1/admin/emails') return over.emails ? over.emails() : list();
    if (path === '/api/v1/admin/email-values')
      return over.values ? over.values() : res({ data: mockEmailValues() });
    return res(null, 404);
  });
}

const TOTAL = mockEmailList().length;

beforeEach(() => {
  h.GET.mockReset();
  replace.mockClear();
  h.params = new URLSearchParams();
});

describe('Admin Emails: list', () => {
  it('shows the header, the tabs and one card per template, rows linking to the editor', async () => {
    serve();
    renderScreen(<AdminEmailsScreen />);
    expect(screen.getByRole('heading', { level: 1, name: 'Emails' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Emails', selected: true })).toBeInTheDocument();
    const card = await screen.findByRole('region', { name: 'Sessions confirmed' });
    expect(within(card).getByText('2 emails · Template “session_confirmed”')).toBeInTheDocument();
    // Named by its content, so who it goes to and the last edit are heard too.
    const row = within(card).getByRole('link', { name: /^Session booked/ });
    expect(row).toHaveAttribute('href', '/admin/emails/session_booked');
    expect(row).toHaveAccessibleName(expect.stringContaining('Mentor and mentee'));
    expect(row).toHaveAccessibleName(expect.stringContaining('Ada Okeke'));
    expect(screen.getByText(`Showing ${TOTAL} of ${TOTAL}`)).toBeInTheDocument();
  });

  it('an email with its own template is a card of one, Not set up, default wording', async () => {
    serve();
    renderScreen(<AdminEmailsScreen />);
    const card = await screen.findByRole('region', { name: 'Session canceled' });
    expect(within(card).getByText('1 email · Template “session_cancelled”')).toBeInTheDocument();
    const row = within(card).getByRole('link', { name: /^Session canceled/ });
    expect(row).toHaveAccessibleName(expect.stringContaining('Not set up'));
    expect(within(row).getAllByText('Default wording').length).toBeGreaterThan(0);
  });

  it('search and filters narrow the list; Clear filters resets both', async () => {
    serve();
    renderScreen(<AdminEmailsScreen />);
    await screen.findByRole('region', { name: 'Credits' });
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search' }), 'credits');
    expect(screen.getByText(`Showing 3 of ${TOTAL}`)).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Messages' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(screen.getByRole('searchbox', { name: 'Search' })).toHaveValue('');
    expect(screen.getByText(`Showing ${TOTAL} of ${TOTAL}`)).toBeInTheDocument();
  });

  it('Goes to: Admins keeps only emails with an admins variant', async () => {
    serve();
    renderScreen(<AdminEmailsScreen />);
    await screen.findByRole('region', { name: 'Credits' });
    await userEvent.click(screen.getByRole('combobox', { name: 'Goes to' }));
    await userEvent.click(screen.getByRole('option', { name: 'Admins' }));
    expect(screen.getByText(`Showing 1 of ${TOTAL}`)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^Application received/ })).toBeInTheDocument();
  });

  it('no match says so', async () => {
    serve();
    renderScreen(<AdminEmailsScreen />);
    await screen.findByRole('region', { name: 'Credits' });
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search' }), 'zzzz');
    expect(screen.getByRole('heading', { name: 'No emails match' })).toBeInTheDocument();
  });

  it('loading: skeleton rows and no count', () => {
    h.GET.mockImplementation(() => new Promise(() => {}));
    renderScreen(<AdminEmailsScreen />);
    expect(screen.getByRole('status', { name: 'Loading emails' })).toHaveAttribute(
      'aria-busy',
      'true',
    );
    expect(screen.queryByText(/^Showing/)).toBeNull();
  });

  it('error comes before empty, and Try again loads again', async () => {
    let fail = true;
    serve({ emails: () => (fail ? res({ type: 'about:blank' }, 500) : list()) });
    renderScreen(<AdminEmailsScreen />);
    // A 5xx is retried once before the error shows.
    expect(
      await screen.findByRole('heading', { name: 'We couldn’t load emails' }, { timeout: 5000 }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'No emails yet' })).toBeNull();
    fail = false;
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('region', { name: 'Credits' })).toBeInTheDocument();
  });

  it('a failed reload keeps the loaded list and the filters', async () => {
    let fail = false;
    serve({ emails: () => (fail ? res({ type: 'about:blank' }, 400) : list()) });
    const { container, qc } = renderScreen(<AdminEmailsScreen />);
    await screen.findByRole('region', { name: 'Credits' });
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search' }), 'credits');
    fail = true;
    // A background refetch (as on window focus) that fails.
    await act(() => qc.refetchQueries());
    await waitFor(() =>
      expect(qc.getQueryState(['admin', 'admin-1', 'emails', 'list'])?.status).toBe('error'),
    );
    expect(screen.queryByRole('heading', { name: 'We couldn’t load emails' })).toBeNull();
    expect(screen.getByRole('searchbox', { name: 'Search' })).toHaveValue('credits');
    expect(screen.getByRole('button', { name: 'Clear filters' })).toBeInTheDocument();
    expect(container.querySelectorAll('section')).toHaveLength(1);
  });

  it('none at all: "No emails yet"', async () => {
    serve({ emails: () => res({ data: [], next_cursor: null }) });
    renderScreen(<AdminEmailsScreen />);
    expect(await screen.findByRole('heading', { name: 'No emails yet' })).toBeInTheDocument();
  });
});

describe('Admin Emails: Values', () => {
  it('?view=variables opens Values: a read-only table with fallbacks and where each is used', async () => {
    h.params = new URLSearchParams('view=variables');
    serve();
    renderScreen(<AdminEmailsScreen />);
    expect(screen.getByRole('tab', { name: 'Values', selected: true })).toBeInTheDocument();
    const table = await screen.findByRole('table', { name: 'Values' });
    const code = (await within(table).findByText('code')).closest('[role="row"]') as HTMLElement;
    expect(within(code).getByText('None: the email isn’t sent')).toBeInTheDocument();
    const name = within(table).getByText('mentorName').closest('[role="row"]') as HTMLElement;
    expect(within(name).getByText(/and \d+ more$/)).toBeInTheDocument();
  });

  it('search filters by name or meaning; no match says so outside the table', async () => {
    h.params = new URLSearchParams('view=variables');
    serve();
    renderScreen(<AdminEmailsScreen />);
    const table = await screen.findByRole('table', { name: 'Values' });
    await within(table).findByText('code');
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search values' }), 'sign-in');
    expect(within(table).getAllByRole('row')).toHaveLength(2);
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search values' }), 'zz');
    const none = screen.getByText('No values match “sign-inzz”.');
    expect(table).not.toContainElement(none);
  });

  it('no values at all says so, not "No values match “”"', async () => {
    h.params = new URLSearchParams('view=variables');
    serve({ values: () => res({ data: [] }) });
    renderScreen(<AdminEmailsScreen />);
    expect(
      await screen.findByText('No values yet. They show up here once engineering adds them.'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/No values match/)).toBeNull();
  });
});

describe('Admin Emails: tabs and ?view=', () => {
  it('Values writes ?view=variables, keeps other params, and the list panel keeps its search', async () => {
    h.params = new URLSearchParams('foo=1');
    serve();
    renderScreen(<AdminEmailsScreen />);
    await screen.findByRole('region', { name: 'Credits' });
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search' }), 'credits');
    await userEvent.click(screen.getByRole('tab', { name: 'Values' }));
    expect(replace).toHaveBeenCalledWith('/admin/emails?foo=1&view=variables', { scroll: false });
    await waitFor(() =>
      expect(screen.getByRole('tab', { name: 'Values', selected: true })).toBeInTheDocument(),
    );
    const listPanel = document.getElementById('admin-emails-list')!;
    expect(listPanel).toHaveAttribute('hidden');
    expect(within(listPanel).getByDisplayValue('credits')).toBeInTheDocument();
  });

  it('Emails drops ?view and keeps the rest', async () => {
    h.params = new URLSearchParams('foo=1&view=variables');
    serve();
    renderScreen(<AdminEmailsScreen />);
    await userEvent.click(screen.getByRole('tab', { name: 'Emails' }));
    expect(replace).toHaveBeenCalledWith('/admin/emails?foo=1', { scroll: false });
  });
});
