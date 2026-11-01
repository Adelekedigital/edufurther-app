/**
 * Tells this app's server where a mentor's landing on Explore should go
 * (app/api/landing-hint), or that it shouldn't (null). Sent once per signed-in
 * user and value per page load; a failure is ignored: the hint is a
 * convenience, and the next page load tries again.
 */
let sent: string | undefined;

export function saveLandingHint(userId: string, home: string | null): void {
  const key = `${userId}:${home ?? ''}`;
  if (key === sent) return;
  sent = key;
  void fetch('/api/landing-hint', {
    method: home ? 'PUT' : 'DELETE',
    headers: home ? { 'content-type': 'application/json' } : undefined,
    body: home ? JSON.stringify({ home }) : undefined,
    credentials: 'same-origin',
    keepalive: true,
  }).catch(() => {
    sent = undefined;
  });
}

/** Tests only. */
export function resetLandingHint() {
  sent = undefined;
}
