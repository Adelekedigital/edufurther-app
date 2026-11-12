/** Runs one `kind: api` step (or an `api` assertion) against E2E_API_URL. */
import { check, fill, pointer } from './values.mjs';

function sameAs(value, scope) {
  const m = typeof value === 'string' && /^<same as ([a-z0-9_]+)>$/.exec(value);
  return m ? m[1] : null;
}

/** A body field `<same as X>` reuses the same field of step X's body. */
function sameFields(body, scope) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return body;
  const out = { ...body };
  for (const [k, v] of Object.entries(out)) {
    const from = sameAs(v, scope);
    if (from) out[k] = scope.sent(from).body?.[k];
  }
  return out;
}

export async function runApiStep(step, scope, { apiUrl, accounts }) {
  const params = await fill(step.params ?? {}, scope);
  let path = step.path;
  const query = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (path.includes(`{${k}}`)) path = path.replace(`{${k}}`, encodeURIComponent(v));
    else query.set(k, String(v));
  }
  const headers = { Accept: 'application/json' };
  for (const [k, v] of Object.entries(step.headers ?? {})) {
    const from = sameAs(v, scope);
    headers[k] = from ? scope.sent(from).headers[k] : await fill(v, scope);
  }
  const viewer = step.viewer === 'each' ? scope.each : step.viewer;
  if (viewer && viewer !== 'anonymous') headers.Authorization = `Bearer ${accounts.token(viewer)}`;

  let body;
  if (step.body !== undefined) {
    const from = sameAs(step.body, scope);
    body = from ? scope.sent(from).body : await fill(sameFields(step.body, scope), scope);
    headers['Content-Type'] = 'application/json';
  }
  scope.record(step.id, { headers, body });

  const url = `${apiUrl}${path}${query.size ? `?${query}` : ''}`;
  const res = await fetch(url, {
    method: step.method ?? 'GET',
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  const problems = [];
  const want = step.expect ?? {};
  if (want.status !== undefined && res.status !== want.status) {
    const why =
      json?.type && json.type !== 'about:blank'
        ? json.type
        : JSON.stringify(json?.detail ?? json?.errors ?? '').slice(0, 300);
    problems.push(`status ${res.status}, expected ${want.status} (${why})`);
  }
  for (const [ptr, expected] of Object.entries(want.json ?? {})) {
    const why = await check(pointer(json, ptr), expected, scope);
    if (why) problems.push(`${ptr}: ${why}`);
  }
  for (const [name, ptr] of Object.entries(step.save ?? {})) {
    // A pointer that misses saves nothing, so a later ${name} fails loudly
    // instead of reading as the text "undefined".
    const value = pointer(json, ptr);
    if (value === undefined) problems.push(`save ${name}: ${ptr} is absent`);
    else scope.save(name, value);
  }
  // Remember who /me is while the account exists (ACCT-001 deletes it).
  if (step.path === '/api/v1/me' && res.ok && json?.id && viewer && viewer !== 'anonymous')
    accounts.remember(viewer, json.id);
  return {
    ok: problems.length === 0,
    detail: problems.join('; ') || `${res.status}`,
    status: res.status,
  };
}
