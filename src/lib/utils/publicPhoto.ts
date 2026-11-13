/** Where Supabase Storage serves a public object. */
const PUBLIC_OBJECT_PATH = '/storage/v1/object/public/';

/**
 * A photo shown to a signed-out visitor, or fetched by a link preview, loads
 * only from our own Supabase project's public storage (https, the host of
 * NEXT_PUBLIC_SUPABASE_URL): any other URL could count who opens a link, or
 * make the server fetch something else. Anything else shows the initials.
 * The env is read per call so a test can set it.
 */
export function publicPhoto(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const project = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!project) return null;
    const ours = new URL(project).host;
    const u = new URL(url);
    return u.protocol === 'https:' && u.host === ours && u.pathname.startsWith(PUBLIC_OBJECT_PATH)
      ? url
      : null;
  } catch {
    return null;
  }
}
