import { loadZoneData } from '@/lib/vendor/tz/zoneData';
import {
  COMMON_ZONES,
  MAX_RESULTS,
  canonicalZone,
  offsetOf,
  searchZones,
  zoneLabel,
  zoneRows,
} from './timezones';

const at = new Date('2026-01-15T12:00:00Z');

describe('zoneLabel', () => {
  it('keeps the labels other screens already show', () => {
    expect(zoneLabel('Africa/Lagos')).toBe('Lagos (WAT)');
    expect(zoneLabel('America/New_York')).toBe('New York (ET)');
    expect(zoneLabel('Asia/Kolkata')).toBe('India (IST)');
  });
  it('names African zones Intl has no short name for, and any other zone by city', () => {
    expect(zoneLabel('Africa/Accra')).toBe('Accra (GMT)');
    expect(zoneLabel('Africa/Douala')).toBe('Douala (WAT)');
    expect(zoneLabel('Africa/Johannesburg')).toBe('Johannesburg (SAST)');
    expect(zoneLabel('Asia/Tokyo')).toMatch(/^Tokyo/);
  });
});

describe('offsetOf', () => {
  it('is the live GMT offset, GMT+0 for GMT itself', () => {
    expect(offsetOf('Africa/Lagos', at)).toBe('GMT+1');
    expect(offsetOf('Africa/Accra', at)).toBe('GMT+0');
    expect(offsetOf('Asia/Kolkata', at)).toBe('GMT+5:30');
  });
});

describe('with the dataset', () => {
  it('finds a zone by country, city, abbreviation or offset, accents ignored', async () => {
    const rows = zoneRows(await loadZoneData(), at);
    const ids = (q: string) => searchZones(rows, q).map((r) => r.id);
    expect(ids('Ghana')).toContain('Africa/Accra');
    expect(ids('cameroon')).toContain('Africa/Douala');
    expect(ids('Nigeria')).toContain('Africa/Lagos');
    expect(ids('Kumasi')).toContain('Africa/Accra');
    expect(ids('yaounde')).toContain('Africa/Douala');
    expect(ids('WAT')).toContain('Africa/Lagos');
    expect(ids('gmt+1 nigeria')).toEqual(['Africa/Lagos']);
    expect(searchZones(rows, 'zzzz')).toEqual([]);
  });
  it('covers every common zone, caps results and sorts by offset', async () => {
    const rows = zoneRows(await loadZoneData(), at);
    for (const id of COMMON_ZONES) expect(rows.some((r) => r.id === id)).toBe(true);
    expect(searchZones(rows, 'a').length).toBe(MAX_RESULTS);
    const mins = searchZones(rows, 'africa').map((r) => r.minutes);
    expect(mins).toEqual([...mins].sort((a, b) => a - b));
  });
  it('always has a UTC row, and a row for a saved zone the dataset lacks', async () => {
    const rows = zoneRows(await loadZoneData(), at, ['Etc/GMT+5']);
    expect(rows.some((r) => r.id === 'UTC')).toBe(true);
    expect(rows.some((r) => r.id === 'Etc/GMT+5')).toBe(true);
  });
  it('reads an old alias as its canonical zone', async () => {
    expect(canonicalZone('Asia/Calcutta', await loadZoneData())).toBe('Asia/Kolkata');
    expect(canonicalZone('Africa/Lagos', null)).toBe('Africa/Lagos');
    // Without the dataset too: other screens label a Chrome device zone the same way.
    expect(canonicalZone('Asia/Calcutta', null)).toBe('Asia/Kolkata');
    expect(zoneLabel('Asia/Calcutta')).toBe('India (IST)');
  });
});

describe('without the dataset', () => {
  it('falls back to the browser’s list, searchable by city', () => {
    const rows = zoneRows(null, at);
    expect(rows.length).toBeGreaterThan(300);
    expect(searchZones(rows, 'accra').map((r) => r.id)).toContain('Africa/Accra');
  });
});
