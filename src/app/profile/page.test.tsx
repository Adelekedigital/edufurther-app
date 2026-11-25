export {};

// Old app session links: /profile?sessId={legacy id} renders the lookup; anything else goes home.
const h = vi.hoisted(() => ({
  redirect: vi.fn((to: string) => {
    throw Object.assign(new Error('NEXT_REDIRECT'), { to });
  }),
}));
vi.mock('next/navigation', () => ({ redirect: h.redirect }));
vi.mock('./_components/LegacySessionRedirect', () => ({
  LegacySessionRedirect: ({ legacyId }: { legacyId: string }) => `lookup:${legacyId}`,
}));

const { default: LegacyProfileRoot } = await import('./page');
const open = (q: Record<string, string | string[] | undefined>) =>
  LegacyProfileRoot({ searchParams: Promise.resolve(q) });

describe('/profile', () => {
  it('a legacy session id: looks it up', async () => {
    const el = await open({ r: 'yes', sessId: '1794911874439x785277113719766700' });
    expect(el.props.legacyId).toBe('1794911874439x785277113719766700');
  });

  it.each([{}, { sessId: 'abc' }, { sessId: ['1x1', '2x2'] }, { r: 'yes' }])(
    'no usable sessId (%o): home',
    async (q) => {
      await expect(open(q)).rejects.toMatchObject({ to: '/' });
    },
  );
});
