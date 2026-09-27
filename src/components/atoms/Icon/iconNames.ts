/**
 * Material Symbols glyphs this app uses. The self-hosted icon font
 * (app/fonts/material-symbols.woff2) is a subset of exactly these names — the
 * full set is several megabytes. After adding a glyph here, run
 * `pnpm icons:pull` and commit the font, or it renders as its ligature text;
 * CI's `pnpm check:icons` fails until you do.
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
  'event_busy',
  'expand_more',
  'explore',
  'home',
  'lock_clock',
  'logout',
  'mail',
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
