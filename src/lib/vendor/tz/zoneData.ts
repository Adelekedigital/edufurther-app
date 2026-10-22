/**
 * Every IANA time zone with its country and main cities, from @vvo/tzdb (MIT),
 * the one place that package enters the app. Loaded on demand: the picker
 * imports this only when it opens, so no page carries the data up front.
 * Offsets are not taken from it; they are computed live, so daylight saving
 * never goes stale.
 */
export type ZoneData = {
  /** The canonical IANA id we store (Africa/Accra). */
  id: string;
  /** Every id that names this zone, aliases included (Asia/Calcutta). */
  ids: string[];
  country: string;
  /** e.g. "Africa", for the row's second line. */
  region: string;
  cities: string[];
};

type RawZone = {
  name: string;
  group: string[];
  countryName: string;
  continentName: string;
  mainCities: string[];
};

export async function loadZoneData(): Promise<ZoneData[]> {
  const raw = (await import('@vvo/tzdb/raw-time-zones.json')).default as RawZone[];
  return raw.map((z) => ({
    id: z.name,
    ids: z.group.length ? z.group : [z.name],
    country: z.countryName,
    region: z.continentName,
    cities: z.mainCities,
  }));
}
