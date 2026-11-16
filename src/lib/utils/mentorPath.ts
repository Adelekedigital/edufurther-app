/** What a mentor link can be built from: the readable slug when there is one. */
export type MentorPathSource = { slug?: string | null; handle?: string | null; id: string };

/**
 * A mentor's profile path, `/mentors/{slug | handle | id}`: the one place it
 * is built, so every link moves to the slug as soon as the API sends one. The
 * route takes the id too, and 308s it to the slug (mentors/[handle]/page.tsx).
 * Undefined query values are left out.
 */
export function mentorProfilePath(
  m: MentorPathSource,
  query?: Record<string, string | undefined>,
): string {
  const path = `/mentors/${encodeURIComponent(m.slug || m.handle || m.id)}`;
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(query ?? {})) if (v !== undefined) q.set(k, v);
  const qs = q.toString();
  return qs ? `${path}?${qs}` : path;
}
