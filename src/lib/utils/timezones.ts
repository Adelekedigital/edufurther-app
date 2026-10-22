/**
 * Time zone labels, offsets and search for TimezonePicker (TimezonePicker.dc.html
 * and its handoff). We store the IANA id; offsets and abbreviations are worked
 * out at display time, for now.
 */
import type { ZoneData } from '@/lib/vendor/tz/zoneData';

/**
 * Labels other screens already show ("times in New York (ET)"): kept word for
 * word, so this change moves nothing outside the picker.
 */
const LABELS: Record<string, string> = {
  'Africa/Lagos': 'Lagos (WAT)',
  'Europe/London': 'London (UK)',
  'America/New_York': 'New York (ET)',
  'America/Chicago': 'Chicago (CT)',
  'America/Los_Angeles': 'Los Angeles (PT)',
  'Europe/Berlin': 'Berlin (CET)',
  'Africa/Nairobi': 'Nairobi (EAT)',
  'Asia/Dubai': 'Dubai (GST)',
  'Asia/Kolkata': 'India (IST)',
  'Australia/Sydney': 'Sydney (AET)',
};

/** Intl has no English short name for most African zones (handoff map). */
const AFRICAN_ABBR: Record<string, string> = {
  'Africa/Lagos': 'WAT',
  'Africa/Douala': 'WAT',
  'Africa/Kinshasa': 'WAT',
  'Africa/Accra': 'GMT',
  'Africa/Nairobi': 'EAT',
  'Africa/Addis_Ababa': 'EAT',
  'Africa/Harare': 'CAT',
  'Africa/Lusaka': 'CAT',
  'Africa/Johannesburg': 'SAST',
  'Africa/Cairo': 'EET',
};

/** Shown before any search (design `POP`), then the current zone. */
export const COMMON_ZONES = [
  'Africa/Lagos',
  'Africa/Accra',
  'Africa/Douala',
  'Africa/Nairobi',
  'Europe/London',
  'America/New_York',
  'America/Toronto',
];

/** The design shows at most this many results. */
export const MAX_RESULTS = 80;

export type ZoneRow = {
  id: string;
  label: string;
  region: string;
  offset: string;
  minutes: number;
  hay: string;
};

const cityOf = (id: string) => (id === 'UTC' ? 'UTC' : id.split('/').pop()!.replace(/_/g, ' '));

function tzPart(id: string, style: 'short' | 'shortOffset', at: Date): string {
  try {
    return (
      new Intl.DateTimeFormat('en-US', { timeZone: id, timeZoneName: style })
        .formatToParts(at)
        .find((p) => p.type === 'timeZoneName')?.value ?? ''
    );
  } catch {
    return '';
  }
}

/** "GMT+1", "GMT-4", "GMT+5:30"; "GMT+0" for GMT itself. */
export const offsetOf = (id: string, at = new Date()) =>
  tzPart(id, 'shortOffset', at).replace(/^GMT$/, 'GMT+0');

function minutesOf(offset: string): number {
  const m = /GMT([+-])(\d{1,2})(?::(\d{2}))?/.exec(offset);
  return m ? (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3] ?? 0)) : 0;
}

/** "Lagos (WAT)", "Toronto (EDT)", or the city alone when there's no short name. */
export const zoneLabel = (id: string): string => labelAt(id, new Date());

function labelAt(id: string, at: Date): string {
  if (LABELS[id]) return LABELS[id];
  const short = tzPart(id, 'short', at);
  const abbr = AFRICAN_ABBR[id] ?? (/^(GMT|UTC)/.test(short) ? '' : short);
  return abbr ? `${cityOf(id)} (${abbr})` : cityOf(id);
}

/** Lower case with accents stripped, so "yaounde" finds Yaoundé. */
const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function row(id: string, region: string, extra: string[], at: Date): ZoneRow {
  const label = labelAt(id, at);
  const offset = offsetOf(id, at);
  return {
    id,
    label,
    region,
    offset,
    minutes: minutesOf(offset),
    hay: fold([id, label, region, offset, AFRICAN_ABBR[id] ?? '', ...extra].join(' ')),
  };
}

/** One row per zone: from the dataset (country and cities searchable), else from Intl alone. */
export function zoneRows(data: ZoneData[] | null, at = new Date()): ZoneRow[] {
  const rows = data
    ? data.map((z) => row(z.id, z.region, [z.country, ...z.cities, ...z.ids], at))
    : intlZones().map((id) =>
        row(id, id.includes('/') ? id.split('/')[0]!.replace(/_/g, ' ') : '', [], at),
      );
  return rows.sort((a, b) => a.minutes - b.minutes || a.label.localeCompare(b.label));
}

function intlZones(): string[] {
  let ids: string[] = [];
  try {
    ids = Intl.supportedValuesOf('timeZone');
  } catch {
    ids = [...COMMON_ZONES, ...Object.keys(LABELS)];
  }
  return ids.includes('UTC') ? ids : [...ids, 'UTC'];
}

/** Every word must match; capped at MAX_RESULTS. */
export function searchZones(rows: ZoneRow[], query: string): ZoneRow[] {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  return rows.filter((r) => words.every((w) => r.hay.includes(w))).slice(0, MAX_RESULTS);
}

/** The canonical id for a saved one (Asia/Calcutta → Asia/Kolkata). */
export function canonicalZone(id: string, data: ZoneData[] | null): string {
  return data?.find((z) => z.ids.includes(id))?.id ?? id;
}
