const h = vi.hoisted(() => ({
  redirect: vi.fn((to: string) => {
    throw new Error(`NEXT_REDIRECT ${to}`);
  }),
}));
vi.mock('next/navigation', () => ({ redirect: (to: string) => h.redirect(to) }));

import SettingsIndex from './page';

const open = (tab?: string | string[]) =>
  SettingsIndex({ searchParams: Promise.resolve(tab === undefined ? {} : { tab }) });

beforeEach(() => {
  h.redirect.mockClear();
});

describe('/settings', () => {
  it('?tab= naming a tab goes there', async () => {
    await expect(open('goals')).rejects.toThrow('NEXT_REDIRECT /settings/goals');
  });

  it('no tab, or one that isn’t a tab: the screen picks the role’s first tab', async () => {
    await expect(open()).resolves.toBeNull();
    await expect(open('nope')).resolves.toBeNull();
    await expect(open(['goals', 'profile'])).resolves.toBeNull();
    expect(h.redirect).not.toHaveBeenCalled();
  });
});
