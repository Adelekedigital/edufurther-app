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
