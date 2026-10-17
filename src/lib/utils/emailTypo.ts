/** Common domain slips and their fix (Sign In.dc.html, TYPO). */
const TYPO: Record<string, string> = {
  'gmial.com': 'gmail.com',
  'gmal.com': 'gmail.com',
  'gmai.com': 'gmail.com',
  'gmail.co': 'gmail.com',
  'gamil.com': 'gmail.com',
  'yaho.com': 'yahoo.com',
  'yahoo.co': 'yahoo.com',
  'hotmal.com': 'hotmail.com',
  'outlok.com': 'outlook.com',
  'outlook.co': 'outlook.com',
  'icloud.co': 'icloud.com',
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** What is sent: trimmed and lowercased (handoff, Validation). */
export function normaliseEmail(value: string): string {
  return value.trim().toLowerCase();
}

/** A basic shape check; the code email is the real proof the address works. */
export function isEmail(value: string): boolean {
  return EMAIL.test(normaliseEmail(value));
}

/** "amara@gmail.com" for "Amara@gmial.com"; null when nothing looks mistyped. */
export function emailTypoFix(value: string): string | null {
  const [local, domain, ...extra] = normaliseEmail(value).split('@');
  if (!local || !domain || extra.length) return null;
  const fixed = TYPO[domain];
  return fixed ? `${local}@${fixed}` : null;
}
