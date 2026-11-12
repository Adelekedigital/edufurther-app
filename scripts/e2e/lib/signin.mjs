/**
 * Signs a Playwright context in as a seed account.
 *
 * Why not just open the link: the admin `generate_link` that e2e_session.py
 * uses makes an implicit-flow link, so Supabase returns the session in the URL
 * hash. The app only accepts PKCE codes (`/auth/callback`), on purpose: taking
 * a session from a hash would let anyone sign a victim into the sender's
 * account. So the runner opens the link, reads the session from the hash, and
 * writes the cookie @supabase/ssr itself would write. Test-only; nothing in
 * the app changes.
 */

const CHUNK = 3180; // @supabase/ssr MAX_CHUNK_SIZE

function b64url(text) {
  return Buffer.from(text, 'utf8').toString('base64url');
}

function claims(jwt) {
  return JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString('utf8'));
}

function sessionFromHash(url) {
  const hash = new URL(url).hash.replace(/^#/, '');
  const p = new URLSearchParams(hash);
  const access = p.get('access_token');
  if (!access) return null;
  const c = claims(access);
  return {
    access_token: access,
    refresh_token: p.get('refresh_token'),
    expires_in: Number(p.get('expires_in')),
    expires_at: Number(p.get('expires_at')),
    token_type: p.get('token_type') || 'bearer',
    user: {
      id: c.sub,
      aud: c.aud,
      role: c.role,
      email: c.email,
      app_metadata: c.app_metadata ?? {},
      user_metadata: c.user_metadata ?? {},
    },
  };
}

/** Cookies for the session, chunked the way @supabase/ssr reads them. */
function sessionCookies(session, projectRef, frontendUrl) {
  const name = `sb-${projectRef}-auth-token`;
  const value = `base64-${b64url(JSON.stringify(session))}`;
  const { hostname } = new URL(frontendUrl);
  const base = { domain: hostname, path: '/', secure: true, sameSite: 'Lax', httpOnly: false };
  if (value.length <= CHUNK) return [{ ...base, name, value }];
  const out = [];
  for (let i = 0; i * CHUNK < value.length; i += 1) {
    out.push({ ...base, name: `${name}.${i}`, value: value.slice(i * CHUNK, (i + 1) * CHUNK) });
  }
  return out;
}

/**
 * Signs `context` in as `ref`. The link is used once, in a throwaway page, so
 * the session never appears in a screenshot.
 */
export async function signIn(context, { accounts, ref, frontendUrl, projectRef }) {
  const link = accounts.link(ref, `${frontendUrl}/login`);
  const page = await context.newPage();
  let session = null;
  page.on('framenavigated', (frame) => {
    if (frame === page.mainFrame() && !session) session = sessionFromHash(frame.url());
  });
  await page.goto(link, { waitUntil: 'commit' });
  await page
    .waitForURL((u) => u.hash.includes('access_token'), { timeout: 30_000 })
    .catch(() => {});
  session ??= sessionFromHash(page.url());
  await page.close();
  if (!session) throw new Error(`sign-in link for ${ref} returned no session`);
  await context.clearCookies();
  await context.addCookies(sessionCookies(session, projectRef, frontendUrl));
  return session.user.id;
}
