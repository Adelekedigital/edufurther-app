import { mockReviewSummary } from '@/lib/api/mock/reviews';
import { mockMentorReviewList } from '@/lib/api/mock/reviewList';
import { GET } from './route';

type Row = { id: string; service_offerings: { slug: string }[] };
const HANDLE = 'm-olajuwon';
const ctx = { params: Promise.resolve({ handle: HANDLE }) };
const get = (query: string) => GET(new Request(`http://localhost/x?limit=50&${query}`), ctx);
const rows = async (query: string): Promise<Row[]> => (await (await get(query)).json()).data;

describe('mock GET /mentors/{handle}/reviews by topic (backend #522)', () => {
  beforeEach(() => {
    vi.stubEnv('ENABLE_MOCK_API', '1');
    vi.useFakeTimers({ toFake: ['setTimeout'] });
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });
  // The route waits 250ms to feel like a network; skip it.
  const run = <T>(p: Promise<T>) => (vi.runAllTimersAsync(), p);

  it('some reviews have two topics and some none, from catalog slugs', () => {
    const list = mockMentorReviewList(HANDLE);
    expect(list.some((r) => r.service_offerings?.length === 2)).toBe(true);
    expect(list.some((r) => r.service_offerings?.length === 0 && r.session_type)).toBe(true);
  });

  it('each review_topics count is exactly what its filter pages through', async () => {
    const topics = mockReviewSummary(HANDLE, mockMentorReviewList(HANDLE)).review_topics ?? [];
    expect(topics.length).toBeGreaterThan(1);
    for (const t of topics) {
      const page = await run(rows(`offering=${t.slug}`));
      expect(page, t.slug).toHaveLength(t.count);
    }
    // A review about two topics counts under both, so the counts outgrow the list.
    const sum = topics.reduce((n, t) => n + t.count, 0);
    expect(sum).toBeGreaterThan(
      (await run(rows(''))).filter((r) => r.service_offerings.length).length,
    );
  });

  it('most reviewed first, then by name', () => {
    const topics = mockReviewSummary(HANDLE, mockMentorReviewList(HANDLE)).review_topics ?? [];
    const sorted = [...topics].sort(
      (a, b) => b.count - a.count || a.display_name.localeCompare(b.display_name),
    );
    expect(topics).toEqual(sorted);
  });

  it('several offerings match ANY of them; a blank one is no filter', async () => {
    const [a, b] = mockReviewSummary(HANDLE, mockMentorReviewList(HANDLE)).review_topics!;
    const either = await run(rows(`offering=${a!.slug}&offering=${b!.slug}`));
    expect(
      either.every((r) => r.service_offerings.some((o) => [a!.slug, b!.slug].includes(o.slug))),
    ).toBe(true);
    expect(either.length).toBeGreaterThanOrEqual(Math.max(a!.count, b!.count));
    expect(await run(rows('offering='))).toHaveLength((await run(rows(''))).length);
  });

  it('an unknown slug, or more than ten, is a 422', async () => {
    expect((await run(get('offering=not-a-topic'))).status).toBe(422);
    const eleven = Array.from({ length: 11 }, () => 'offering=test-preparation').join('&');
    expect((await run(get(eleven))).status).toBe(422);
  });
});
