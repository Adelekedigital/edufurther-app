import type { Inviter } from '@/lib/api/data/inviter';
import { lastDrawn } from '@/lib/og/_test/ogHarness';

const lookup = vi.fn<(code: string, origin: string) => Promise<Inviter | null>>();
vi.mock('@/lib/api/data/inviteServer', () => ({
  lookupInviterOnServer: (c: string, o: string) => lookup(c, o),
}));
vi.mock('next/headers', () => ({ headers: async () => new Headers({ host: 'app.test' }) }));
vi.mock('next/og', async () => (await import('@/lib/og/_test/ogHarness')).nextOg);
vi.mock('@/lib/og/ogAssets', async (orig) => ({
  ...(await orig<typeof import('@/lib/og/ogAssets')>()),
  ...(await import('@/lib/og/_test/ogHarness')).assetStubs,
  photoData: async () => null,
}));

const { default: Image } = await import('./opengraph-image');
const draw = async (code: string) => {
  await Image({ params: Promise.resolve({ code }) });
  return lastDrawn();
};

describe('invite opengraph-image', () => {
  it('names the inviter with their initial', async () => {
    lookup.mockResolvedValue({ firstName: 'Damilola', photoUrl: null });
    const html = await draw('damilola-7k2x');
    expect(lookup).toHaveBeenCalledWith('damilola-7k2x', 'https://app.test');
    expect(html).toContain('Damilola invited you to EduFurther');
    expect(html).toContain('>D<');
  });

  it('a code that can’t be joined draws the fallback with the mark', async () => {
    lookup.mockResolvedValue(null);
    const html = await draw('gone-0000');
    expect(html).toContain('Get 1:1 help with your grad school applications');
    expect(html).toContain('src="data:mark"');
  });
});
