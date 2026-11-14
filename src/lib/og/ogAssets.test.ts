import { PHOTO_MAX_BYTES, photoData } from './ogAssets';

const OURS = 'https://abc.supabase.co/storage/v1/object/public/avatars/a.png';
const fetchMock = vi.fn<typeof fetch>();
const png = (
  body: BodyInit | null,
  init: ResponseInit & { headers?: Record<string, string> } = {},
) =>
  new Response(body, {
    status: 200,
    ...init,
    headers: { 'content-type': 'image/png', ...init.headers },
  });

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://abc.supabase.co');
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe('photoData', () => {
  it('a photo from our public storage comes back as a data URL, fetched with no redirects', async () => {
    fetchMock.mockResolvedValue(png(new Uint8Array([1, 2, 3])));
    expect(await photoData(OURS)).toBe('data:image/png;base64,AQID');
    expect(fetchMock.mock.calls[0]![0]).toBe(OURS);
    expect(fetchMock.mock.calls[0]![1]).toMatchObject({ redirect: 'error' });
  });

  it('never fetches a host or path that isn’t our public storage', async () => {
    for (const url of [
      'https://evil.test/a.png',
      'https://other.supabase.co/storage/v1/object/public/a.png',
      'https://abc.supabase.co/storage/v1/object/sign/a.png',
      'http://abc.supabase.co/storage/v1/object/public/a.png',
      null,
    ])
      expect(await photoData(url)).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('null for a wrong content type or a failed answer', async () => {
    fetchMock.mockResolvedValueOnce(
      png('<svg/>', { headers: { 'content-type': 'image/svg+xml' } }),
    );
    expect(await photoData(OURS)).toBeNull();
    fetchMock.mockResolvedValueOnce(png('nope', { headers: { 'content-type': 'text/html' } }));
    expect(await photoData(OURS)).toBeNull();
    fetchMock.mockResolvedValueOnce(png(null, { status: 404 }));
    expect(await photoData(OURS)).toBeNull();
  });

  it('null on a timeout or a refused redirect (fetch rejects)', async () => {
    fetchMock.mockRejectedValueOnce(new DOMException('timed out', 'TimeoutError'));
    expect(await photoData(OURS)).toBeNull();
    fetchMock.mockRejectedValueOnce(new TypeError('redirect mode is set to error'));
    expect(await photoData(OURS)).toBeNull();
  });

  it('null for an oversized photo, by its content-length or by the bytes read', async () => {
    fetchMock.mockResolvedValueOnce(
      png(new Uint8Array(8), { headers: { 'content-length': String(PHOTO_MAX_BYTES + 1) } }),
    );
    expect(await photoData(OURS)).toBeNull();
    // No (or a false) content-length: the bytes themselves are counted.
    fetchMock.mockResolvedValueOnce(png(new Uint8Array(PHOTO_MAX_BYTES + 1)));
    expect(await photoData(OURS)).toBeNull();
    fetchMock.mockResolvedValueOnce(png(new Uint8Array(PHOTO_MAX_BYTES)));
    expect(await photoData(OURS)).not.toBeNull();
  });
});
