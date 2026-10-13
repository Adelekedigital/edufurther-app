import { ok, problem } from './respond';

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

describe('problem', () => {
  it('answers the status as application/problem+json, status in the body too', async () => {
    const res = problem(404);
    expect(res.status).toBe(404);
    expect(res.headers.get('content-type')).toBe('application/problem+json');
    expect(await res.json()).toEqual({ type: 'about:blank', title: 'Error', status: 404 });
  });

  it('lets the body override type and title, and add fields', async () => {
    const res = problem(422, {
      type: '/problems/bad-cursor',
      title: 'Validation failed',
      detail: 'Bad cursor.',
      errors: [{ pointer: '/limit' }],
    });
    expect(await res.json()).toEqual({
      type: '/problems/bad-cursor',
      title: 'Validation failed',
      detail: 'Bad cursor.',
      errors: [{ pointer: '/limit' }],
      status: 422,
    });
  });

  it('never lets the body disagree with the status line', async () => {
    const res = problem(409, { status: 200 });
    expect(res.status).toBe(409);
    expect((await res.json()).status).toBe(409);
  });

  it('keeps extra headers, and the problem content-type wins', () => {
    const res = problem(409, {}, {
      headers: { 'Retry-After': '30', 'content-type': 'application/json' },
    });
    expect(res.headers.get('retry-after')).toBe('30');
    expect(res.headers.get('content-type')).toBe('application/problem+json');
  });
});

/**
 * Compile-time cases, never called: `tsc` (CI's typecheck) fails if `ok` stops
 * rejecting these, e.g. if SuccessBody ever widened to `unknown`.
 */
export function contractCases() {
  // @ts-expect-error accept answers booleans, not a status string
  ok('/api/v1/sessions/{session_id}/accept', 'post', { status: 'ok' });
  // @ts-expect-error a created session is a full SessionRead
  ok('/api/v1/sessions', 'post', { id: 's1' });
  // @ts-expect-error profile PATCH answers 204: no body to send
  ok('/api/v1/users/{user_id}/profile', 'patch', {});
  ok('/api/v1/sessions/{session_id}/accept', 'post', { accepted: true });
  // @ts-expect-error a problem is an error: 200 is not one
  problem(200);
  problem(404);
}

describe('contract cases', () => {
  it('exist for the typecheck to judge', () => {
    expect(typeof contractCases).toBe('function');
  });
});
