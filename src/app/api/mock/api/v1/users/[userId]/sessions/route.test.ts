import { GET } from './route';

const ctx = { params: Promise.resolve({ userId: 'mock-mentor' }) };
const get = (query: string) => GET(new Request(`http://localhost/x?${query}`), ctx);

describe('mock GET /users/{id}/sessions paging', () => {
  beforeEach(() => vi.stubEnv('ENABLE_MOCK_API', '1'));
  afterEach(() => vi.unstubAllEnvs());

  it('takes back the cursor it hands out, so page 2 loads', async () => {
    const first = await (await get('limit=2')).json();
    expect(first.next_cursor).toMatch(/^o\d+[ad]$/);
    const second = await get(`limit=2&cursor=${first.next_cursor}`);
    expect(second.status).toBe(200);
    const page = await second.json();
    expect(page.data[0].id).not.toBe(first.data[0].id);
  });

  it('refuses a cursor that is not its own with the restart problem', async () => {
    const res = await get('limit=2&cursor=nonsense');
    expect(res.status).toBe(422);
    expect((await res.json()).type).toBe('/problems/bad-cursor');
  });
});
