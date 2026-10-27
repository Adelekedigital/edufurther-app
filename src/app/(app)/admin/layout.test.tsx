import { render, screen } from '@testing-library/react';
import type { Viewer } from '@/types/mentor';

const h = vi.hoisted(() => ({ viewer: { kind: 'loading', signedIn: true } as Viewer }));
const notFound = vi.hoisted(() =>
  vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
);
vi.mock('next/navigation', () => ({ notFound, usePathname: () => '/admin/mentors' }));
vi.mock('@/lib/api/data/viewer', () => ({ useViewer: () => h.viewer }));

const { default: AdminLayout } = await import('./layout');

const member = (over: object): Viewer =>
  ({
    kind: 'member',
    id: 'u1',
    firstName: 'Ada',
    initials: 'AO',
    isMentee: true,
    isApprovedMentor: false,
    isMentor: false,
    completedSessions: 0,
    credits: null,
    ...over,
  }) as Viewer;

const page = () =>
  render(
    <AdminLayout>
      <p>Admin page</p>
    </AdminLayout>,
  );

describe('the /admin gate (Admin PRD, Access)', () => {
  beforeEach(() => {
    notFound.mockClear();
  });

  it('while /me loads, a neutral skeleton and nothing admin', () => {
    h.viewer = { kind: 'loading', signedIn: true };
    page();
    expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument();
    expect(screen.queryByText('Admin page')).toBeNull();
    expect(notFound).not.toHaveBeenCalled();
  });

  it.each([
    ['a guest', { kind: 'guest' } as Viewer],
    ['a mentee', member({})],
    ['a mentor', member({ isMentor: true, isApprovedMentor: true })],
  ])('%s gets the not-found page', (_who, viewer) => {
    h.viewer = viewer;
    expect(page).toThrow('NEXT_NOT_FOUND');
    expect(notFound).toHaveBeenCalled();
  });

  it('a platform admin sees the page', () => {
    h.viewer = member({ isAdmin: true, adminRole: 'super_admin' });
    page();
    expect(screen.getByText('Admin page')).toBeInTheDocument();
  });
});
