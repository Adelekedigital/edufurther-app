import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { keys } from '@/lib/api/data/keys';
import type { Viewer } from '@/types/mentor';

// Both flows on, before access.ts reads them.
vi.hoisted(() => {
  process.env.NEXT_PUBLIC_ONBOARDING_ENABLED = 'true';
  process.env.NEXT_PUBLIC_MENTOR_ONBOARDING_ENABLED = 'true';
});
const { wrongRoleHome } = await import('@/lib/utils/access');
const { onboardingDestination } = await import('./OnboardingEntry');
const { StepCounterRow } = await import('./StepCounterRow');

const PATCH = vi.fn();
vi.mock('@/lib/api/data/http', () => ({ api: { PATCH: (...a: unknown[]) => PATCH(...a) } }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

// The viewer the row reads is the cached one, so a patch shows as it would on the page.
let qc: QueryClient;
const ME = keys.viewer.me('u1');
vi.mock('@/lib/api/data/viewer', async (orig) => ({
  ...(await orig<typeof import('@/lib/api/data/viewer')>()),
  useViewer: () => qc.getQueryData(ME) as Viewer,
}));

type Member = Extract<Viewer, { kind: 'member' }>;
const fresh = (over: Partial<Member> = {}): Member => ({
  kind: 'member',
  id: 'u1',
  firstName: 'Ada',
  initials: 'AO',
  isMentee: false,
  isApprovedMentor: false,
  isMentor: false,
  onboardingStarted: false,
  onboardingComplete: false,
  completedSessions: 0,
  credits: null,
  ...over,
});

function setup(viewer: Member, from: 'mentee' | 'mentor') {
  qc = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  qc.setQueryData(ME, viewer);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  render(<StepCounterRow label="Step 1 of 2" from={from} canSwitch />, { wrapper });
}

const ok = () => ({ response: new Response(null, { status: 200 }) });

beforeEach(() => PATCH.mockReset());

describe('StepCounterRow: switching onboardings (owner, 2026-10-20)', () => {
  it('mentee → mentor: saves the role once, and the role redirect lands on mentor onboarding', async () => {
    PATCH.mockResolvedValue(ok());
    setup(fresh(), 'mentee');
    const link = screen.getByRole('button', { name: 'Join as a mentor' });
    // The visible text stays small; the 44px area is the class's ::after.
    expect(link).toHaveClass('roleSwitch');
    await userEvent.click(link);
    await waitFor(() =>
      expect(qc.getQueryData<Member>(ME)).toMatchObject({ signedUpAsMentor: true }),
    );
    expect(PATCH).toHaveBeenCalledTimes(1);
    expect(PATCH).toHaveBeenCalledWith('/api/v1/users/{user_id}/profile', {
      params: { path: { user_id: 'u1' } },
      body: { primary_role: 'mentor' },
    });
    expect(wrongRoleHome(qc.getQueryData<Member>(ME)!, '/onboarding/mentee')).toBe(
      '/onboarding/mentor',
    );
  });

  it('mentor → mentee: saves mentee, and the redirect goes on to mentee onboarding', async () => {
    PATCH.mockResolvedValue(ok());
    setup(fresh({ signedUpAsMentor: true }), 'mentor');
    await userEvent.click(screen.getByRole('button', { name: 'Join as a mentee' }));
    await waitFor(() =>
      expect(qc.getQueryData<Member>(ME)).toMatchObject({ signedUpAsMentor: false }),
    );
    expect(PATCH).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ body: { primary_role: 'mentee' } }),
    );
    const v = qc.getQueryData<Member>(ME)!;
    // memberHome sends an unfinished mentee to the /onboarding entry, which opens their flow.
    expect(wrongRoleHome(v, '/onboarding/mentor')).toBe('/onboarding');
    expect(onboardingDestination(v, new URLSearchParams())).toBe('/onboarding/mentee');
  });

  it('busy while saving: disabled and aria-busy, so a second tap saves nothing more', async () => {
    let resolve!: (v: unknown) => void;
    PATCH.mockReturnValue(new Promise((r) => (resolve = r)));
    setup(fresh(), 'mentee');
    const link = screen.getByRole('button', { name: 'Join as a mentor' });
    await userEvent.dblClick(link);
    await waitFor(() => expect(link).toBeDisabled());
    expect(link).toHaveAttribute('aria-busy', 'true');
    expect(PATCH).toHaveBeenCalledTimes(1);
    resolve(ok());
  });

  it('a failed save says so and stays: the viewer keeps its role', async () => {
    PATCH.mockResolvedValue({ response: new Response(null, { status: 503 }), error: {} });
    setup(fresh(), 'mentee');
    await userEvent.click(screen.getByRole('button', { name: 'Join as a mentor' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Couldn’t switch. Try again.');
    expect(qc.getQueryData<Member>(ME)?.signedUpAsMentor).toBeUndefined();
    expect(screen.getByRole('button', { name: 'Join as a mentor' })).toBeEnabled();
  });

  it('no switch for an account with a step saved: the counter alone, on the right', () => {
    setup(fresh({ onboardingStarted: true }), 'mentee');
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByText('Step 1 of 2')).toHaveClass('end');
  });
});
