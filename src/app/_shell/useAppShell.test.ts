import type { Viewer } from '@/types/mentor';
import { accountItems } from './useAppShell';

vi.mock('@/lib/api/data/auth', () => ({ useSignOut: () => vi.fn() }));
vi.mock('@/lib/api/data/viewer', () => ({ useViewer: () => ({ kind: 'guest' }) }));

type Member = Extract<Viewer, { kind: 'member' }>;
const member = (over: Partial<Member> = {}): Member => ({
  kind: 'member',
  id: 'u1',
  firstName: 'Gbenga',
  initial: 'G',
  isMentee: false,
  isApprovedMentor: true,
  isMentor: true,
  completedSessions: 0,
  credits: null,
  ...over,
});

describe('accountItems (AppShell.dc.html account menu)', () => {
  // A failed assertion must not leak the stubbed env into later tests.
  afterEach(() => vi.unstubAllEnvs());

  it('a mentor: "View profile" first, linking to their own profile, then Logout', () => {
    const items = accountItems(member(), vi.fn());
    expect(items.map((i) => i.label)).toEqual(['View profile', 'Logout']);
    expect(items[0]).toMatchObject({ icon: 'account_box', href: '/mentors/u1' });
  });

  it('a mentee: no "View profile" (no mentee profile page yet, #50)', () => {
    const items = accountItems(
      member({ isMentor: false, isApprovedMentor: false, isMentee: true }),
      vi.fn(),
    );
    expect(items.map((i) => i.label)).not.toContain('View profile');
    expect(items.at(-1)!.label).toBe('Logout');
  });

  it('Logout signs out', () => {
    const signOut = vi.fn();
    const logout = accountItems(member(), signOut).at(-1)!;
    if ('onSelect' in logout && logout.onSelect) logout.onSelect();
    expect(signOut).toHaveBeenCalled();
  });

  it("the design's order with both: View profile, Find my mentor matches, Logout (pending mentor)", async () => {
    vi.stubEnv('NEXT_PUBLIC_MATCH_CALL_URL', 'https://cal.example/match');
    vi.resetModules();
    const { accountItems: fresh } = await import('./useAppShell');
    const items = fresh(member({ isApprovedMentor: false }), vi.fn());
    expect(items.map((i) => i.label)).toEqual(['View profile', 'Find my mentor matches', 'Logout']);
  });

  it('no member (loading, or not signed in as a member): Logout only', () => {
    expect(accountItems(null, vi.fn()).map((i) => i.label)).toEqual(['Logout']);
  });
});
