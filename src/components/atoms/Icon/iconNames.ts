/**
 * Material Symbols glyphs this app uses. The root layout loads the icon font
 * subset to exactly these names — the full set is several megabytes. Add a
 * glyph here before using it, or it renders as its ligature text.
 */
export const ICON_NAMES = [
  'arrow_forward',
  'bolt',
  'chat',
  'check',
  'check_circle',
  'close',
  'cloud_off',
  'edit',
  'error',
  'event',
  'expand_more',
  'explore',
  'home',
  'lock_clock',
  'remove',
  'menu',
  'my_location',
  'open_in_new',
  'new_releases',
  'refresh',
  'route',
  'schedule',
  'search',
  'settings',
  'star',
  'upload_file',
] as const;

export type IconName = (typeof ICON_NAMES)[number];

export const MATERIAL_SYMBOLS_HREF =
  'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..24,400,0..1,0' +
  `&icon_names=${[...ICON_NAMES].sort().join(',')}&display=block`;
