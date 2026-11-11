/**
 * The design's contact-details pattern (Messages.dc.html `CONTACT_RE`): an
 * email address, or a run of digits long enough to be a phone number. While a
 * message holds one, Messages and SendMessage show a notice; it never blocks
 * sending. It also matches some dates ("2026-10-28"): the design's pattern, kept.
 */
export const CONTACT_RE = /[\w.+-]+@[\w-]+\.[\w.]+|\+?\d[\d\s().-]{7,}\d/;

/** Whether the text looks like it shares an email address or a phone number. */
export function hasContactDetails(text: string): boolean {
  return CONTACT_RE.test(text);
}

const CONTACT_ALL = new RegExp(CONTACT_RE.source, `${CONTACT_RE.flags}g`);

/**
 * The same pattern, masked: what an error report may say about a message or
 * a field that held one (error tracking never sends an email or a phone).
 */
export function maskContactDetails(text: string): string {
  return text.replace(CONTACT_ALL, '[redacted]');
}
