/** Case- and accent-insensitive, so "cote" finds Côte d’Ivoire. Every text search uses it. */
export const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
