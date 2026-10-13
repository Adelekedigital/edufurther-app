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
}

describe('contract cases', () => {
  it('exist for the typecheck to judge', () => {
    expect(typeof contractCases).toBe('function');
  });
});
