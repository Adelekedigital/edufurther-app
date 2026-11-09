export {};

const h = vi.hoisted(() => ({ live: false }));
const notFound = vi.fn(() => {
  throw new Error('NEXT_NOT_FOUND');
});
vi.mock('next/navigation', () => ({ notFound }));
vi.mock('@/lib/config/adminEmails', () => ({
  get ADMIN_EMAILS_LIVE() {
    return h.live;
  },
}));
vi.mock('./_components/AdminEmailsScreen', () => ({ AdminEmailsScreen: () => null }));

const { default: AdminEmailsPage } = await import('./page');

describe('/admin/emails behind ADMIN_EMAILS_LIVE', () => {
  it('off: not found', () => {
    h.live = false;
    expect(() => AdminEmailsPage()).toThrow('NEXT_NOT_FOUND');
  });
  it('on: the screen', () => {
    h.live = true;
    expect(() => AdminEmailsPage()).not.toThrow();
    expect(notFound).not.toHaveBeenCalled();
  });
});
