import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  creditLog,
  creditRules,
  grantCredits,
  menteeCredits,
  resetMockCredits,
  searchMentees,
} from '@/lib/api/mock/adminCredits';
import { AdminCreditsScreen } from './AdminCreditsScreen';

// The real hooks over the mock ledger: the client answers as the mock routes do.
const ok = (data: unknown) => ({ data, response: new Response(null, { status: 200 }) });
const fail = (status: number) => ({
  data: undefined,
  error: {},
  response: new Response(null, { status }),
});
const postFails = { on: false };
const gone = new Set<string>();
type Init = { params?: { path?: { user_id: string }; query?: Record<string, string> } };

vi.mock('@/lib/api/data/http', () => ({
  api: {
    GET: async (path: string, init: Init = {}) => {
      const query = init.params?.query ?? {};
      if (path === '/api/v1/admin/mentees')
        return ok({ data: searchMentees(query.q ?? ''), next_cursor: null });
      if (path === '/api/v1/admin/mentees/{user_id}/credits') {
        const id = init.params!.path!.user_id;
        const body = gone.has(id) ? null : menteeCredits(id);
        return body ? ok(body) : fail(404);
      }
      if (path === '/api/v1/admin/credit-log')
        return ok(creditLog(query.type ?? null, query.cursor ?? null, query.mentee_id ?? null));
      if (path === '/api/v1/admin/credit-rules') return ok(creditRules());
      return fail(404);
    },
    POST: async (
      _path: string,
      init: { params: { header: Record<string, string> }; body: never },
    ) =>
      postFails.on
        ? fail(500)
        : ok(grantCredits(init.params.header['Idempotency-Key']!, init.body)),
  },
}));

const viewer = {
  kind: 'member',
  id: 'admin-1',
  isAdmin: true,
  adminRole: 'limited_access',
  timeZone: 'Africa/Lagos',
};
vi.mock('@/lib/api/data/viewer', () => ({ useViewer: () => viewer }));

let phone = false;
beforeEach(() => {
  resetMockCredits();
  postFails.on = false;
  gone.clear();
  phone = false;
  window.matchMedia = (query: string) =>
    ({
      media: query,
      matches: phone && query.includes('max-width: 767px'),
      addEventListener: () => {},
      removeEventListener: () => {},
    }) as unknown as MediaQueryList;
});

function renderScreen() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrap = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return render(<AdminCreditsScreen />, { wrapper: wrap });
}

async function pickAmara() {
  await userEvent.type(screen.getByRole('searchbox', { name: 'Find a mentee' }), 'amara');
  await screen.findByText('1 match', {}, { timeout: 2000 });
  const row = screen.getByRole('button', { name: /Amara Okafor/ });
  await userEvent.click(row);
  return row;
}

describe('AdminCreditsScreen', () => {
  it('opens on Add credits with the recent mentees and the pick hint', async () => {
    renderScreen();
    expect(screen.getByRole('heading', { level: 1, name: 'Credits' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Add credits' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(await screen.findByText('Recent mentees')).toBeInTheDocument();
    expect(screen.getByText('Pick a mentee to see their balance and history.')).toBeInTheDocument();
  });

  it('search, pick, add 2 with a reason, confirm: balance, history and toast update; the form resets', async () => {
    renderScreen();
    await pickAmara();
    const panel = await screen.findByRole('region', { name: 'Credits for Amara Okafor' });
    expect(
      await within(panel).findByText('amara.okafor@example.com · a3f2c1d4'),
    ).toBeInTheDocument();
    expect(within(panel).getByText('of 3')).toBeInTheDocument();

    await userEvent.click(within(panel).getByRole('button', { name: 'One more' }));
    await userEvent.click(within(panel).getByRole('combobox', { name: 'Reason (optional)' }));
    await userEvent.click(screen.getByRole('option', { name: 'Goodwill' }));
    const add = within(panel).getByRole('button', { name: 'Add 2 credits' });
    await userEvent.click(add);

    const dialog = screen.getByRole('alertdialog', { name: 'Add 2 credits for Amara?' });
    expect(dialog).toHaveAccessibleDescription(
      'They can use them right away. Added credits reset with the rest on Nov 1.',
    );
    expect(within(dialog).getByText('Now').nextSibling).toHaveTextContent('1');
    expect(within(dialog).getByText('After').nextSibling).toHaveTextContent('3');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Add credits' }));

    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(await screen.findByText('2 credits added for Amara Okafor')).toBeInTheDocument();
    expect(within(panel).getByText('Added by admin · Goodwill')).toBeInTheDocument();
    expect(within(panel).getByText('of 3')).toBeInTheDocument();
    expect(within(panel).getByRole('button', { name: 'Add 1 credit' })).toHaveFocus();
    expect(within(panel).getByRole('combobox', { name: 'Reason (optional)' })).toHaveTextContent(
      'Choose a reason',
    );
  });

  it('the total rises when the balance passes it ("3 of 3" plus 2 reads "5 of 5")', async () => {
    grantCredits('seed', { user_ids: ['a3f2c1d4-2041-4418-9c1e-5b7d4e2f2041'], quantity: 2 });
    renderScreen();
    await pickAmara();
    const panel = await screen.findByRole('region', { name: 'Credits for Amara Okafor' });
    expect(await within(panel).findByText('of 3')).toBeInTheDocument();
    await userEvent.click(within(panel).getByRole('button', { name: 'One more' }));
    await userEvent.click(within(panel).getByRole('button', { name: 'Add 2 credits' }));
    await userEvent.click(screen.getByRole('button', { name: 'Add credits' }));
    expect(await within(panel).findByText('of 5')).toBeInTheDocument();
  });

  it('a failed add closes the confirm, changes nothing and says so', async () => {
    postFails.on = true;
    renderScreen();
    await pickAmara();
    const panel = await screen.findByRole('region', { name: 'Credits for Amara Okafor' });
    await within(panel).findByText('of 3');
    await userEvent.click(within(panel).getByRole('button', { name: 'One more' }));
    const add = within(panel).getByRole('button', { name: 'Add 2 credits' });
    await userEvent.click(add);
    await userEvent.click(screen.getByRole('button', { name: 'Add credits' }));
    expect(
      await screen.findByText('That didn’t go through. Nothing changed, try again.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(within(panel).queryByText(/Added by admin/)).toBeNull();
    expect(add).toHaveFocus();
    expect(within(panel).getByRole('button', { name: 'Add 2 credits' })).toBeInTheDocument();
  });

  it('Cancel and Escape close the confirm with focus back on Add', async () => {
    renderScreen();
    await pickAmara();
    const panel = await screen.findByRole('region', { name: 'Credits for Amara Okafor' });
    const add = await within(panel).findByRole('button', { name: 'Add 1 credit' });
    await userEvent.click(add);
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(add).toHaveFocus();
    await userEvent.click(add);
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(add).toHaveFocus();
  });

  it('changing tab clears the pick', async () => {
    renderScreen();
    await pickAmara();
    await screen.findByRole('region', { name: 'Credits for Amara Okafor' });
    await userEvent.click(screen.getByRole('tab', { name: 'Credit log' }));
    await userEvent.click(screen.getByRole('tab', { name: 'Add credits' }));
    expect(screen.queryByRole('region', { name: /Credits for/ })).toBeNull();
    expect(screen.getByText('Pick a mentee to see their balance and history.')).toBeInTheDocument();
  });

  it('the log filters by chip, and a mentee opens their drawer; Close returns focus', async () => {
    renderScreen();
    await userEvent.click(screen.getByRole('tab', { name: 'Credit log' }));
    const table = await screen.findByRole('table', { name: 'Credit log' });
    expect(within(table).getAllByText('Credits expired')).toHaveLength(1);
    await userEvent.click(screen.getByRole('button', { name: 'Refunds' }));
    await waitFor(() => expect(screen.queryByText('Credits expired')).toBeNull());
    const rows = within(screen.getByRole('table', { name: 'Credit log' }))
      .getAllByRole('row')
      .slice(1);
    expect(rows.every((r) => /Refunded/.test(r.textContent ?? ''))).toBe(true);
    expect(screen.getByText('Refunded: request not accepted')).toBeInTheDocument();

    const link = screen.getAllByRole('button', { name: 'Amara Okafor' })[0]!;
    await userEvent.click(link);
    const drawer = screen.getByRole('dialog', { name: 'Credits for Amara Okafor' });
    expect(await within(drawer).findByText('Credit history')).toBeInTheDocument();
    await userEvent.click(within(drawer).getByRole('button', { name: 'Close' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(link).toHaveFocus();
  });

  it('on phones the panel opens full screen as a dialog, Escape returns to the row', async () => {
    phone = true;
    renderScreen();
    expect(screen.queryByText('Pick a mentee to see their balance and history.')).toBeNull();
    const row = await pickAmara();
    expect(screen.getByRole('dialog', { name: 'Credits for Amara Okafor' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: /Credits for/ })).toBeNull();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(row).toHaveFocus();
  });

  it('a 404 for the mentee (now a mentor, or deleted) is the panel error state', async () => {
    gone.add('a3f2c1d4-2041-4418-9c1e-5b7d4e2f2041');
    renderScreen();
    await pickAmara();
    const panel = await screen.findByRole('region', { name: 'Credits for Amara Okafor' });
    expect(
      await within(panel).findByRole('heading', { name: 'We couldn’t load credits' }),
    ).toBeInTheDocument();
    expect(within(panel).getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('phone: with the drawer and the confirm open, Escape closes only the confirm, focus back on Add', async () => {
    phone = true;
    renderScreen();
    await pickAmara();
    const drawer = screen.getByRole('dialog', { name: 'Credits for Amara Okafor' });
    const add = await within(drawer).findByRole('button', { name: 'Add 1 credit' });
    await userEvent.click(add);
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(screen.getByRole('dialog', { name: 'Credits for Amara Okafor' })).toBeInTheDocument();
    expect(add).toHaveFocus();
  });

  it('adding from the Credit log drawer refreshes the log table', async () => {
    renderScreen();
    await userEvent.click(screen.getByRole('tab', { name: 'Credit log' }));
    const table = await screen.findByRole('table', { name: 'Credit log' });
    expect(within(table).queryByText(/^Added by admin · Goodwill$/)).toBeNull();
    await userEvent.click(within(table).getAllByRole('button', { name: 'Amara Okafor' })[0]!);
    const drawer = screen.getByRole('dialog', { name: 'Credits for Amara Okafor' });
    await within(drawer).findByText('Credit history');
    await userEvent.click(within(drawer).getByRole('combobox', { name: 'Reason (optional)' }));
    await userEvent.click(screen.getByRole('option', { name: 'Goodwill' }));
    await userEvent.click(within(drawer).getByRole('button', { name: 'Add 1 credit' }));
    await userEvent.click(screen.getByRole('button', { name: 'Add credits' }));
    await screen.findByText('1 credit added for Amara Okafor');
    await userEvent.click(within(drawer).getByRole('button', { name: 'Close' }));
    const rows = within(screen.getByRole('table', { name: 'Credit log' })).getAllByRole('row');
    expect(rows[1]).toHaveTextContent('Added by admin · Goodwill');
    expect(rows[1]).toHaveTextContent('+1');
  });

  it('the rules panel takes focus itself, as nothing in it can', async () => {
    renderScreen();
    await userEvent.click(screen.getByRole('tab', { name: 'Credit rules' }));
    expect(screen.getByRole('tabpanel')).toHaveAttribute('tabindex', '0');
  });

  it('the rules tab shows the server values, read-only', async () => {
    renderScreen();
    await userEvent.click(screen.getByRole('tab', { name: 'Credit rules' }));
    expect(await screen.findByText('Starter credits')).toBeInTheDocument();
    expect(
      screen.getByText('What every new mentee gets once, when they finish their profile.'),
    ).toBeInTheDocument();
    expect(screen.getByText(/Monthly credits start once both happen/)).toBeInTheDocument();
  });
});
