/**
 * An email address or a phone number in a message (Messages.dc.html and
 * SendMessage.dc.html `CONTACT_RE`, verbatim). While the text holds one, the
 * composer shows the contact-details notice. It never blocks sending.
 * One pattern for every composer: Messages and SendMessage.
 */
export const CONTACT_RE = /[\w.+-]+@[\w-]+\.[\w.]+|\+?\d[\d\s().-]{7,}\d/;

export function hasContactDetails(text: string): boolean {
  return CONTACT_RE.test(text);
}
