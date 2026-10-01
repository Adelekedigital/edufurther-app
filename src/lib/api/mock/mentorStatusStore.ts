/**
 * The mock mentor's listing and video default (ENABLE_MOCK_API=1). Mirrors
 * backend calendar reply #1–2: pause takes an optional `return_on` after today
 * (else 422); resume clears it; conferencing defaults to EduFurther video.
 */
export const mentorStatus = {
  listing_status: 'listed' as 'listed' | 'unlisted',
  paused_by_mentor: false,
  return_on: null as string | null,
};

export function pause(body: { return_on?: unknown } | null): number {
  const r = body?.return_on ?? null;
  const today = new Date().toISOString().slice(0, 10);
  if (r !== null && (typeof r !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(r) || r <= today))
    return 422;
  mentorStatus.listing_status = 'unlisted';
  mentorStatus.paused_by_mentor = true;
  mentorStatus.return_on = r;
  return 200;
}

export function resume(): number {
  if (!mentorStatus.paused_by_mentor) return 404;
  mentorStatus.listing_status = 'listed';
  mentorStatus.paused_by_mentor = false;
  mentorStatus.return_on = null;
  return 200;
}

export const conferencing = {
  provider: 'daily' as 'daily' | 'google_meet' | 'custom',
  custom_url: null as string | null,
  is_default_choice: true,
};

export function setConferencing(body: { provider?: unknown; custom_url?: unknown }): number {
  const { provider, custom_url = null } = body;
  if (provider !== 'daily' && provider !== 'google_meet' && provider !== 'custom') return 422;
  if (
    provider === 'custom'
      ? typeof custom_url !== 'string' || !custom_url.startsWith('https://')
      : custom_url !== null
  )
    return 422;
  conferencing.provider = provider;
  conferencing.custom_url = custom_url as string | null;
  conferencing.is_default_choice = false;
  return 200;
}
