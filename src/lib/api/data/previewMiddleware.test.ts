import {
  createPreviewMiddleware,
  isAdminCall,
  isPreviewEnded,
  PREVIEW_HEADER,
  PROBLEM_PREVIEW_ENDED,
  PROBLEM_PREVIEW_NOT_FOUND,
  PROBLEM_READ_ONLY,
} from './previewMiddleware';
import { previewStore, resetPreviewStoreForTests, type PreviewUser } from './previewStore';

type Mw = ReturnType<typeof createPreviewMiddleware>;
// openapi-fetch passes more fields; the middleware reads only these.
const send = async (mw: Mw, url: string) =>
  ((await mw.onRequest!({ request: new Request(url) } as never)) as Request) ?? new Request(url);
const answer = async (mw: Mw, request: Request, response: Response) =>
  (await mw.onResponse!({ request, response } as never)) as Response;

const problem = (status: number, body: object) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/problem+json' },
  });

const amara: PreviewUser = {
  id: 'u-1',
  email: 'amara.okafor@example.com',
  name: 'Amara Okafor',
  firstName: 'Amara',
  initials: 'AO',
  role: 'mentee',
};
const startPreview = () =>
  previewStore.started('s-1', amara, { revealed: false, canReveal: false }, '/admin/mentors');

beforeEach(() => {
  sessionStorage.clear();
  resetPreviewStoreForTests();
});

describe('isAdminCall', () => {
  it('admin routes, absolute or relative', () => {
    expect(isAdminCall('https://x.test/api/v1/admin/users?q=a')).toBe(true);
    expect(isAdminCall('/api/v1/admin/preview-sessions/s-1/end')).toBe(true);
    expect(isAdminCall('/api/mock/api/v1/admin/users')).toBe(true);
  });
  it('member routes are not', () => {
    expect(isAdminCall('https://x.test/api/v1/me')).toBe(false);
    expect(isAdminCall('/api/v1/mentors?admin=1')).toBe(false);
  });
});

describe('createPreviewMiddleware: the header', () => {
  it('not previewing: no header', async () => {
    const req = await send(createPreviewMiddleware(), 'https://x.test/api/v1/me');
    expect(req.headers.has(PREVIEW_HEADER)).toBe(false);
  });

  it('previewing: every member call carries X-EF-Preview', async () => {
    startPreview();
    const req = await send(createPreviewMiddleware(), 'https://x.test/api/v1/me');
    expect(req.headers.get(PREVIEW_HEADER)).toBe('s-1');
  });

  it('previewing: the admin’s own calls go without it', async () => {
    startPreview();
    const req = await send(createPreviewMiddleware(), 'https://x.test/api/v1/admin/users');
    expect(req.headers.has(PREVIEW_HEADER)).toBe(false);
  });
});

describe('createPreviewMiddleware: writes are never sent', () => {
  const call = (mw: Mw, url: string, method: string) =>
    mw.onRequest!({ request: new Request(url, { method }) } as never);

  it.each(['POST', 'PUT', 'PATCH', 'DELETE'])(
    'previewing: a member %s is answered here with the read-only 403, and "Read only" opens',
    async (method) => {
      startPreview();
      const out = await call(createPreviewMiddleware(), 'https://x.test/api/v1/me/profile', method);
      expect(out).toBeInstanceOf(Response);
      const res = out as Response;
      expect(res.status).toBe(403);
      expect(await res.json()).toMatchObject({
        type: PROBLEM_READ_ONLY,
        code: 'read_only_view_as',
      });
      expect(previewStore.get().blocked).toBe(true);
    },
  );

  it('previewing: reads still go, with the header', async () => {
    startPreview();
    for (const method of ['GET', 'HEAD', 'OPTIONS']) {
      const out = await call(createPreviewMiddleware(), 'https://x.test/api/v1/me', method);
      expect(out).toBeInstanceOf(Request);
      expect((out as Request).headers.get(PREVIEW_HEADER)).toBe('s-1');
    }
    expect(previewStore.get().blocked).toBe(false);
  });

  it('previewing: the admin’s own writes go (exit, page views, reveal)', async () => {
    startPreview();
    const out = await call(
      createPreviewMiddleware(),
      'https://x.test/api/v1/admin/preview-sessions/s-1/end',
      'POST',
    );
    expect(out).toBeInstanceOf(Request);
    expect(previewStore.get().blocked).toBe(false);
  });

  it('not previewing: writes go as always', async () => {
    const out = await call(createPreviewMiddleware(), 'https://x.test/api/v1/me/profile', 'PATCH');
    expect(out).toBeInstanceOf(Request);
  });
});

describe('createPreviewMiddleware: answers', () => {
  it('401 preview-ended ends the preview with the server’s reason', async () => {
    startPreview();
    const mw = createPreviewMiddleware();
    const req = await send(mw, 'https://x.test/api/v1/me');
    const res = problem(401, { type: PROBLEM_PREVIEW_ENDED, end_reason: 'max_length' });
    expect(await answer(mw, req, res)).toBe(res);
    expect(previewStore.get()).toMatchObject({
      sessionId: null,
      ended: { name: 'Amara Okafor', reason: 'max_length', returnTo: '/admin/mentors' },
    });
  });

  it('401 preview-ended for sign_out ends it quietly', async () => {
    startPreview();
    const mw = createPreviewMiddleware();
    const req = await send(mw, 'https://x.test/api/v1/me');
    await answer(mw, req, problem(401, { type: PROBLEM_PREVIEW_ENDED, end_reason: 'sign_out' }));
    expect(previewStore.get()).toMatchObject({
      sessionId: null,
      ended: null,
      dropped: { returnTo: '/admin/mentors' },
    });
  });

  it('401 preview-ended for exit (a duplicated tab after Exit elsewhere) ends it quietly', async () => {
    startPreview();
    const mw = createPreviewMiddleware();
    const req = await send(mw, 'https://x.test/api/v1/me');
    await answer(mw, req, problem(401, { type: PROBLEM_PREVIEW_ENDED, end_reason: 'exit' }));
    expect(previewStore.get()).toMatchObject({
      sessionId: null,
      ended: null,
      dropped: { returnTo: '/admin/mentors' },
    });
  });

  it('401 preview-ended with no known reason reads as idle', async () => {
    startPreview();
    const mw = createPreviewMiddleware();
    const req = await send(mw, 'https://x.test/api/v1/me');
    await answer(mw, req, problem(401, { type: PROBLEM_PREVIEW_ENDED, end_reason: 'weird' }));
    expect(previewStore.get().ended?.reason).toBe('idle');
  });

  it('404 preview-not-found (an unusable header) ends it quietly; any other 404 leaves it', async () => {
    startPreview();
    const mw = createPreviewMiddleware();
    const req = await send(mw, 'https://x.test/api/v1/mentors/someone');
    await answer(mw, req, problem(404, { type: 'about:blank', title: 'Not found' }));
    expect(previewStore.get().sessionId).toBe('s-1');
    const req2 = await send(mw, 'https://x.test/api/v1/me');
    await answer(
      mw,
      req2,
      problem(404, { type: PROBLEM_PREVIEW_NOT_FOUND, title: 'Preview not found' }),
    );
    expect(previewStore.get()).toMatchObject({
      sessionId: null,
      ended: null,
      dropped: { returnTo: '/admin/mentors' },
    });
  });

  it('a plain 401 (token expired) leaves the preview alone', async () => {
    startPreview();
    const mw = createPreviewMiddleware();
    const req = await send(mw, 'https://x.test/api/v1/me');
    await answer(mw, req, problem(401, { type: '/problems/unauthorized' }));
    await answer(mw, req, new Response('not json', { status: 401 }));
    expect(previewStore.get().sessionId).toBe('s-1');
  });

  it('403 read-only-view-as: the "Read only" notice', async () => {
    startPreview();
    const mw = createPreviewMiddleware();
    const req = await send(mw, 'https://x.test/api/v1/me/profile');
    await answer(mw, req, problem(403, { type: PROBLEM_READ_ONLY }));
    expect(previewStore.get().blocked).toBe(true);
  });

  it('any other 403, and a 2xx, change nothing', async () => {
    startPreview();
    const mw = createPreviewMiddleware();
    const req = await send(mw, 'https://x.test/api/v1/me/profile');
    await answer(mw, req, problem(403, { type: '/problems/forbidden' }));
    await answer(mw, req, problem(200, { type: PROBLEM_READ_ONLY }));
    expect(previewStore.get()).toMatchObject({ sessionId: 's-1', blocked: false });
  });

  it('ignores answers to calls sent without the header (an admin call)', async () => {
    startPreview();
    const mw = createPreviewMiddleware();
    const req = await send(mw, 'https://x.test/api/v1/admin/users');
    await answer(mw, req, problem(401, { type: PROBLEM_PREVIEW_ENDED, end_reason: 'idle' }));
    await answer(mw, req, problem(403, { type: PROBLEM_READ_ONLY }));
    expect(previewStore.get()).toMatchObject({ sessionId: 's-1', blocked: false, ended: null });
  });

  it('leaves the body readable for the caller', async () => {
    startPreview();
    const mw = createPreviewMiddleware();
    const req = await send(mw, 'https://x.test/api/v1/me/profile');
    const res = await answer(mw, req, problem(403, { type: PROBLEM_READ_ONLY }));
    expect(await res.json()).toEqual({ type: PROBLEM_READ_ONLY });
  });
});

describe('isPreviewEnded', () => {
  it('only a 401 whose problem type is preview-ended', async () => {
    expect(await isPreviewEnded(problem(401, { type: PROBLEM_PREVIEW_ENDED }))).toBe(true);
    expect(await isPreviewEnded(problem(401, { type: '/problems/unauthorized' }))).toBe(false);
    expect(await isPreviewEnded(problem(403, { type: PROBLEM_PREVIEW_ENDED }))).toBe(false);
    expect(await isPreviewEnded(new Response(null, { status: 401 }))).toBe(false);
    expect(await isPreviewEnded(new Response('null', { status: 401 }))).toBe(false);
  });

  it('does not use up the body', async () => {
    const res = problem(401, { type: PROBLEM_PREVIEW_ENDED });
    await isPreviewEnded(res);
    expect(await res.json()).toEqual({ type: PROBLEM_PREVIEW_ENDED });
  });
});
