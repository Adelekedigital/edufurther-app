import { supportEmail } from '@/lib/config/support';

/** A mail to support, with the subject and body prefilled when given. */
export function supportMailto(subject?: string, body?: string): string {
  const q = [
    subject && `subject=${encodeURIComponent(subject)}`,
    body && `body=${encodeURIComponent(body)}`,
  ].filter(Boolean);
  return `mailto:${supportEmail()}${q.length ? `?${q.join('&')}` : ''}`;
}

export type SupportPerson = { name: string; firstName: string; email: string; mentor: boolean };

/**
 * A request to support from a signed-in person, subject and body prefilled in
 * the request's own words (Settings' email change). Falls back to the email when there's no name.
 */
export function supportHref(
  p: { name: string; email: string; mentor: boolean },
  request: { subject: (name: string) => string; body: (p: SupportPerson) => string },
): string {
  const name = p.name.trim() || p.email;
  const firstName = name.split(/\s+/)[0] ?? name;
  return supportMailto(
    request.subject(name),
    request.body({ name, firstName, email: p.email, mentor: p.mentor }),
  );
}

/**
 * A mail to one person. The local part is encoded, so an address that
 * carries `?` or `&` can't add a subject, body or recipients of its own.
 */
export function mailtoHref(email: string): string {
  const at = email.lastIndexOf('@');
  if (at < 1) return `mailto:${encodeURIComponent(email)}`;
  return `mailto:${encodeURIComponent(email.slice(0, at))}@${encodeURIComponent(email.slice(at + 1))}`;
}
