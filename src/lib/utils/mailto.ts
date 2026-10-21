import { supportEmail } from '@/lib/config/support';

/** A mail to support, with the subject and body prefilled when given. */
export function supportMailto(subject?: string, body?: string): string {
  const q = [
    subject && `subject=${encodeURIComponent(subject)}`,
    body && `body=${encodeURIComponent(body)}`,
  ].filter(Boolean);
  return `mailto:${supportEmail()}${q.length ? `?${q.join('&')}` : ''}`;
}
