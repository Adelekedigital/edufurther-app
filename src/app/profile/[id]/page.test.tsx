export {};

// Old app profile links: /profile/{legacy id} 308s to /mentors/{legacy id}.
const h = vi.hoisted(() => ({
  permanentRedirect: vi.fn((to: string) => {
    throw Object.assign(new Error('NEXT_REDIRECT'), { to });
  }),
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));
vi.mock('next/navigation', () => ({
  permanentRedirect: h.permanentRedirect,
  notFound: h.notFound,
}));

const { default: LegacyProfilePage } = await import('./page');

const open = (id: string, query: Record<string, string | string[] | undefined> = {}) =>
  LegacyProfilePage({ params: Promise.resolve({ id }), searchParams: Promise.resolve(query) });

describe('/profile/[id]', () => {
  it('a legacy id: 308 to the mentor route, which resolves it to the slug', async () => {
    await expect(open('1726837410805x205680694778626500')).rejects.toMatchObject({
      to: '/mentors/1726837410805x205680694778626500',
    });
  });

  it('keeps the query', async () => {
    await expect(open('1726837410805x205680694778626500', { ref: 'mail' })).rejects.toMatchObject({
      to: '/mentors/1726837410805x205680694778626500?ref=mail',
    });
  });

  it.each([
    'gbenga-e',
    '..',
    '3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b',
    '12x34',
    '1726837410805x2056/x',
  ])('anything that is not a legacy id (%s) is the ordinary 404', async (id) => {
    await expect(open(id)).rejects.toThrow('NEXT_NOT_FOUND');
    expect(h.permanentRedirect).not.toHaveBeenCalled();
  });
});
