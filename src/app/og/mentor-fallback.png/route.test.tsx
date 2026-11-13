import { lastDrawn } from '@/lib/og/_test/ogHarness';

vi.mock('next/og', async () => (await import('@/lib/og/_test/ogHarness')).nextOg);
vi.mock('@/lib/og/ogAssets', async (orig) => ({
  ...(await orig<typeof import('@/lib/og/ogAssets')>()),
  ...(await import('@/lib/og/_test/ogHarness')).assetStubs,
}));

const { GET, dynamic } = await import('./route');

describe('mentor fallback preview', () => {
  it('is drawn once at build, with the generic lines and the mark', async () => {
    expect(dynamic).toBe('force-static');
    await GET();
    const html = lastDrawn();
    expect(html).toContain('Find a mentor on EduFurther');
    expect(html).toContain('src="data:mark"');
  });
});
