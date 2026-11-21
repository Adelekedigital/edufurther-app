import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { cachedViewer, meEntry, seedMe } from '@/lib/api/data/_test/meEntry';
import type { ViewerPatch } from '@/lib/api/data/me';
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
/** The session's user id, which keys the one /me (me.ts). */
const AUTH = 'auth-1';
const viewerNow = () => cachedViewer(qc, AUTH) as Member;
vi.mock('@/lib/api/data/viewer', async (orig) => ({
  ...(await orig<typeof import('@/lib/api/data/viewer')>()),
  useViewer: () => viewerNow(),
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
  // The whole member over a reply, so the row reads exactly this viewer.
  seedMe(qc, AUTH, meEntry({ id: viewer.id }, viewer as ViewerPatch));
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  render(<StepCounterRow label="Step 1 of 2" from={from} canSwitch />, { wrapper });
}

const ok = () => ({ response: new Response(null, { status: 200 }) });

beforeEach(() => PATCH.mockReset());

const radio = (name: string) => screen.getByRole('radio', { name });

describe('StepCounterRow: switching onboardings (owner, 2026-10-20; RoleToggleQuiet.dc.html)', () => {
  it('is a radiogroup "I’m joining to", the current path checked, left of the counter', () => {
    setup(fresh(), 'mentee');
    const group = screen.getByRole('radiogroup', { name: 'I’m joining to' });
    expect(radio('Get mentored')).toHaveAttribute('aria-checked', 'true');
    expect(radio('Mentor others')).toHaveAttribute('aria-checked', 'false');
    // One tab stop: the checked one.
    expect(radio('Get mentored')).toHaveAttribute('tabindex', '0');
    expect(radio('Mentor others')).toHaveAttribute('tabindex', '-1');
    expect(
      group.compareDocumentPosition(screen.getByText('Step 1 of 2')) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('mentor onboarding shows "Mentor others" picked', () => {
    setup(fresh({ signedUpAsMentor: true }), 'mentor');
    expect(radio('Mentor others')).toHaveAttribute('aria-checked', 'true');
    expect(radio('Get mentored')).toHaveAttribute('aria-checked', 'false');
  });

  it('mentee → mentor: saves the role once, and the role redirect lands on mentor onboarding', async () => {
    PATCH.mockResolvedValue(ok());
    setup(fresh(), 'mentee');
    await userEvent.click(radio('Mentor others'));
    await waitFor(() => expect(viewerNow()).toMatchObject({ signedUpAsMentor: true }));
    expect(PATCH).toHaveBeenCalledTimes(1);
    expect(PATCH).toHaveBeenCalledWith('/api/v1/users/{user_id}/profile', {
      params: { path: { user_id: 'u1' } },
      body: { primary_role: 'mentor' },
    });
    expect(wrongRoleHome(viewerNow(), '/onboarding/mentee')).toBe('/onboarding/mentor');
  });

  it('picking the path already on saves nothing', async () => {
    setup(fresh(), 'mentee');
    await userEvent.click(radio('Get mentored'));
    expect(PATCH).not.toHaveBeenCalled();
  });

  it('the keyboard: an arrow from the current path picks the other and switches', async () => {
    let resolve!: (v: unknown) => void;
    PATCH.mockReturnValue(new Promise((r) => (resolve = r)));
    setup(fresh(), 'mentee');
    await userEvent.tab();
    expect(radio('Get mentored')).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}');
    expect(radio('Mentor others')).toHaveFocus();
    resolve(ok());
    await waitFor(() => expect(viewerNow()).toMatchObject({ signedUpAsMentor: true }));
    expect(PATCH).toHaveBeenCalledTimes(1);
  });

  it('mentor → mentee: saves mentee, and the redirect goes on to mentee onboarding', async () => {
    PATCH.mockResolvedValue(ok());
    setup(fresh({ signedUpAsMentor: true }), 'mentor');
    await userEvent.click(radio('Get mentored'));
    await waitFor(() => expect(viewerNow()).toMatchObject({ signedUpAsMentor: false }));
    expect(PATCH).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ body: { primary_role: 'mentee' } }),
    );
    const v = viewerNow();
    // memberHome sends an unfinished mentee to the /onboarding entry, which opens their flow.
    expect(wrongRoleHome(v, '/onboarding/mentor')).toBe('/onboarding');
    expect(onboardingDestination(v, new URLSearchParams())).toBe('/onboarding/mentee');
  });

  it('busy while saving: aria-disabled and aria-busy, focus kept, a second tap saves nothing more', async () => {
    let resolve!: (v: unknown) => void;
    PATCH.mockReturnValue(new Promise((r) => (resolve = r)));
    setup(fresh(), 'mentee');
    const other = radio('Mentor others');
    await userEvent.dblClick(other);
    const group = screen.getByRole('radiogroup');
    await waitFor(() => expect(group).toHaveAttribute('aria-disabled', 'true'));
    expect(group).toHaveAttribute('aria-busy', 'true');
    // Never native disabled: the focused radio stays in the focus order.
    expect(other).not.toBeDisabled();
    expect(other).toHaveFocus();
    expect(PATCH).toHaveBeenCalledTimes(1);
    resolve(ok());
  });

  it('a failed save says so and stays: the viewer keeps its role', async () => {
    PATCH.mockResolvedValue({ response: new Response(null, { status: 503 }), error: {} });
    setup(fresh(), 'mentee');
    await userEvent.click(radio('Mentor others'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Couldn’t switch. Try again.');
    expect(viewerNow().signedUpAsMentor).toBe(false);
    expect(radio('Get mentored')).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radiogroup')).not.toHaveAttribute('aria-disabled');
  });

  it('no switch for an account with a step saved: the counter alone, on the right', () => {
    setup(fresh({ onboardingStarted: true }), 'mentee');
    expect(screen.queryByRole('radiogroup')).toBeNull();
    expect(screen.getByText('Step 1 of 2')).toHaveClass('end');
  });
});
