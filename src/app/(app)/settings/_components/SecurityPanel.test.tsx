import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { MenteeProfile } from '@/lib/api/data/settings';
import { SECURITY_COPY, SETTINGS_COPY } from '@/lib/copy/settings';
import { SecurityPanel } from './SecurityPanel';

const order: string[] = [];
let read: { profile: MenteeProfile | null; status: 'loading' | 'error' | 'ready' };
vi.mock('@/lib/api/data/settings', () => ({
  useMenteeProfile: () => ({ ...read, retry: vi.fn(), retrying: false }),
}));
let provider: 'email' | 'google' = 'email';
const signOutTo: string[] = [];
vi.mock('@/lib/api/data/auth', () => ({
  signedInUser: async () => ({ loginProvider: provider }),
  useSignOut: (to: string) => {
    signOutTo.push(to);
    return async () => {
      order.push(`signOut ${to}`);
    };
  },
}));
const del = vi.fn();
vi.mock('@/lib/api/data/http', () => ({
  api: {
    DELETE: (path: string, init: unknown) => {
      order.push(`DELETE ${path} ${JSON.stringify((init as { body: unknown }).body)}`);
      return del();
    },
  },
}));

const profile: MenteeProfile = {
  name: 'Amara Okafor',
  countryId: 'ng',
  languages: [],
  bio: '',
  bioDrafted: false,
  photoUrl: null,
  initial: 'A',
  email: 'amara@example.com',
  emailVerified: true,
  upcomingCount: 1,
  requestCount: 0,
};

function setup() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <SecurityPanel userId="u1" />
    </QueryClientProvider>,
  );
}

async function typeAndDelete() {
  await userEvent.click(await screen.findByRole('button', { name: 'Delete account' }));
  await userEvent.type(screen.getByLabelText('Type DELETE to confirm'), 'DELETE');
  await userEvent.click(screen.getByRole('button', { name: 'Delete my account' }));
}

beforeEach(() => {
  order.length = 0;
  del.mockReset();
  read = { profile, status: 'ready' };
  provider = 'email';
});

describe('SecurityPanel', () => {
  it('loading: the cards’ shapes, not the content', () => {
    read = { profile: null, status: 'loading' };
    setup();
    expect(screen.getByLabelText('Loading your login details')).toBeInTheDocument();
  });

  it('a failed /me says so with Try again', () => {
    read = { profile: null, status: 'error' };
    setup();
    expect(screen.getByText(SETTINGS_COPY.loadError)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('how they log in follows the session: Google', async () => {
    provider = 'google';
    setup();
    expect(await screen.findByText('With Google (amara@example.com).')).toBeInTheDocument();
  });

  it('deleted: DELETE /me with the confirm word, then signs out to /login with the notice', async () => {
    del.mockResolvedValue({ response: new Response(null, { status: 204 }) });
    setup();
    await typeAndDelete();
    await waitFor(() =>
      expect(order).toEqual(['DELETE /api/v1/me {"confirm":"DELETE"}', 'signOut /login?deleted=1']),
    );
    expect(signOutTo.every((to) => to === '/login?deleted=1')).toBe(true);
    // Busy until the page leaves.
    expect(screen.getByRole('button', { name: 'Deleting…' })).toHaveAttribute('aria-busy', 'true');
  });

  it('one request however fast the second press', async () => {
    let finish: (v: unknown) => void = () => {};
    del.mockReturnValue(new Promise((r) => (finish = r)));
    setup();
    await userEvent.click(await screen.findByRole('button', { name: 'Delete account' }));
    const input = screen.getByLabelText('Type DELETE to confirm');
    await userEvent.type(input, 'DELETE{Enter}{Enter}');
    finish({ response: new Response(null, { status: 204 }) });
    await waitFor(() => expect(order.filter((o) => o.startsWith('signOut'))).toHaveLength(1));
    expect(del).toHaveBeenCalledTimes(1);
  });

  it('a 422 or a failure: the reason in the confirm, which stays open; no sign-out', async () => {
    del.mockResolvedValueOnce({
      error: { status: 422 },
      response: new Response(null, { status: 422 }),
    });
    setup();
    await typeAndDelete();
    expect(await screen.findByRole('alert')).toHaveTextContent(SECURITY_COPY.wrongWord);
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();

    del.mockResolvedValueOnce({ error: {}, response: new Response(null, { status: 500 }) });
    await userEvent.click(screen.getByRole('button', { name: 'Delete my account' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(SECURITY_COPY.failed);
    expect(order.some((o) => o.startsWith('signOut'))).toBe(false);
  });

  it('the real frame: opens on Keep my account, keeps Tab inside, Escape closes and focus returns', async () => {
    setup();
    const opener = await screen.findByRole('button', { name: 'Delete account' });
    await userEvent.click(opener);
    expect(screen.getByRole('button', { name: 'Keep my account' })).toHaveFocus();
    const dialog = screen.getByRole('alertdialog', { name: 'Delete your account?' });
    for (let i = 0; i < 6; i++) {
      await userEvent.tab();
      expect(dialog.contains(document.activeElement)).toBe(true);
    }
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    await waitFor(() => expect(opener).toHaveFocus());
  });

  it('closing clears the failure', async () => {
    del.mockResolvedValueOnce({ error: {}, response: new Response(null, { status: 500 }) });
    setup();
    await typeAndDelete();
    await screen.findByRole('alert');
    await userEvent.click(screen.getByRole('button', { name: 'Keep my account' }));
    await userEvent.click(screen.getByRole('button', { name: 'Delete account' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
