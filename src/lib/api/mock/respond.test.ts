import { ok } from './respond';

describe('ok', () => {
  it('answers 200 with the body as JSON', async () => {
    const res = ok('/api/v1/mentors/{handle}/reviews', 'get', { data: [], next_cursor: null });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/json');
    expect(await res.json()).toEqual({ data: [], next_cursor: null });
  });

  it('keeps the status it is given', async () => {
    const res = ok(
      '/api/v1/mentors/{handle}/reviews',
      'get',
      { data: [], next_cursor: null },
      { status: 201 },
    );
    expect(res.status).toBe(201);
  });
});
