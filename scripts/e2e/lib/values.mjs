/**
 * The scenario language's values: `${ref.id}` and `${saved}` substitution,
 * `<new>`, `<same as X>`, `<today+N>`, and the `expect.json` matchers.
 * Conventions are the header of the backend's docs/e2e/scenarios.yaml.
 */
import { randomUUID } from 'node:crypto';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MENTOR_ZONE = 'Europe/London'; // mentor_listed's zone in the seed

export function todayPlus(days) {
  const d = new Date(Date.now() + days * 86_400_000);
  return new Intl.DateTimeFormat('en-CA', { timeZone: MENTOR_ZONE }).format(d);
}

/**
 * Replaces every `${…}` in a string. A string that is exactly one `${…}`
 * keeps the value's type (a number stays a number).
 */
export async function fill(value, scope) {
  if (Array.isArray(value)) return Promise.all(value.map((v) => fill(v, scope)));
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = await fill(v, scope);
    return out;
  }
  if (typeof value !== 'string') return value;
  if (value === '<new>') return randomUUID();
  const today = /^<today\+(\d+)>$/.exec(value);
  if (today) return todayPlus(Number(today[1]));
  const whole = /^\$\{([^}]+)\}$/.exec(value);
  if (whole) return scope.resolve(whole[1]);
  const parts = value.split(/(\$\{[^}]+\})/);
  let out = '';
  for (const part of parts) {
    const m = /^\$\{([^}]+)\}$/.exec(part);
    out += m ? String(await scope.resolve(m[1])) : part;
  }
  return out;
}

export function pointer(doc, ptr) {
  if (ptr === '' || ptr === '/') return doc;
  let cur = doc;
  for (const raw of ptr.split('/').slice(1)) {
    const key = raw.replace(/~1/g, '/').replace(/~0/g, '~');
    if (cur === null || cur === undefined) return undefined;
    cur = Array.isArray(cur) ? cur[Number(key)] : cur[key];
  }
  return cur;
}

/** One `expect.json` entry. Returns null when it holds, else why not. */
export async function check(actual, expected, scope) {
  if (typeof expected === 'string') {
    switch (expected) {
      case '<any>':
        return null;
      case '<present>':
        return actual === undefined || actual === null ? 'absent' : null;
      case '<absent>':
        return actual === undefined || actual === null
          ? null
          : `present (${JSON.stringify(actual)})`;
      case '<uuid>':
        return typeof actual === 'string' && UUID.test(actual)
          ? null
          : `not a uuid (${JSON.stringify(actual)})`;
      case '<int>':
        return Number.isInteger(actual) ? null : `not an int (${JSON.stringify(actual)})`;
      case '<nonempty>':
        return (Array.isArray(actual) || typeof actual === 'string') && actual.length > 0
          ? null
          : `empty (${JSON.stringify(actual)})`;
      case '<url>':
        return typeof actual === 'string' && /^https?:\/\//.test(actual)
          ? null
          : `not a url (${JSON.stringify(actual)})`;
      default:
        break;
    }
    const sum = /^\$\{([^}]+)\}\+(\d+)$/.exec(expected);
    if (sum) expected = Number(await scope.resolve(sum[1])) + Number(sum[2]);
    else expected = await fill(expected, scope);
  }
  return JSON.stringify(actual) === JSON.stringify(expected)
    ? null
    : `expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`;
}
