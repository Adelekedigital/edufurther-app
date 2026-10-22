'use client';

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { Icon } from '@/components/atoms/Icon/Icon';
import { Input } from '@/components/atoms/Input/Input';
import { LiveRegion } from '@/components/atoms/LiveRegion/LiveRegion';
import {
  COMMON_ZONES,
  MAX_RESULTS,
  canonicalZone,
  searchZones,
  zoneLabel,
  zoneRows,
  type ZoneRow,
} from '@/lib/utils/timezones';
import { useFocusTrap } from '@/lib/utils/useFocusTrap';
import { useMediaQuery } from '@/lib/utils/useMediaQuery';
import { loadZoneData, type ZoneData } from '@/lib/vendor/tz/zoneData';
import styles from './TimezonePicker.module.css';

export { zoneLabel };

/** Loaded once per session, on the first open (handoff: it's heavy). */
let zoneDataCache: Promise<ZoneData[] | null> | null = null;
const getZoneData = () =>
  (zoneDataCache ??= loadZoneData().catch(() => {
    // Offline or blocked: the browser's own list still works, without countries.
    zoneDataCache = null;
    return null;
  }));

type TimezonePickerProps = {
  value: string;
  onChange: (zone: string) => void;
  /** The device's zone, offered as a one-tap shortcut when it differs. */
  deviceZone: string;
  prefix?: string;
};

/**
 * "Times shown in Lagos (WAT) · Change" (TimezonePicker.dc.html, `editStyle`
 * text). Open: search any city, country or zone; common zones before a search.
 * A popover on desktop, a bottom sheet on phones.
 */
export function TimezonePicker({
  value,
  onChange,
  deviceZone,
  prefix = 'Times shown in',
}: TimezonePickerProps) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [data, setData] = useState<ZoneData[] | null>(null);
  const panelId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const isPhone = useMediaQuery('(max-width: 767px)');

  const close = (restoreFocus = true) => {
    setOpen(false);
    setQ('');
    if (restoreFocus) triggerRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    let live = true;
    void getZoneData().then((d) => live && d && setData(d));
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) close(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => {
      live = false;
      document.removeEventListener('mousedown', onDown);
    };
  }, [open]);

  const current = canonicalZone(value, data);
  const device = canonicalZone(deviceZone, data);
  const rows = useMemo(
    () => (open ? zoneRows(data, new Date(), [current]) : []),
    [open, data, current],
  );
  const needle = q.trim();
  const list: ZoneRow[] = needle
    ? searchZones(rows, needle)
    : [...COMMON_ZONES, ...(COMMON_ZONES.includes(current) ? [] : [current])]
        .map((id) => rows.find((r) => r.id === id))
        .filter((r): r is ZoneRow => !!r);
  const head = needle
    ? `${list.length}${list.length === MAX_RESULTS ? '+' : ''} result${list.length === 1 ? '' : 's'}`
    : 'Common zones · search for any city';

  const pick = (zone: string) => {
    onChange(zone);
    close();
  };

  // Arrow keys move through the rows; Down from the search field enters the
  // list, Up from the first row goes back to it. In the field, Up is left alone.
  const onListKey = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    const items = [...(listRef.current?.querySelectorAll<HTMLButtonElement>('button') ?? [])];
    const at = items.indexOf(document.activeElement as HTMLButtonElement);
    if (!items.length || (e.key === 'ArrowUp' && at < 0)) return;
    e.preventDefault();
    if (e.key === 'ArrowUp' && at === 0) searchRef.current?.focus();
    else items[e.key === 'ArrowDown' ? Math.min(at + 1, items.length - 1) : at - 1]?.focus();
  };

  const label = zoneLabel(current);
  return (
    <span
      ref={wrapRef}
      className={styles.wrap}
      onKeyDown={(e) => {
        if (e.key === 'Escape' && open) {
          e.stopPropagation();
          close();
        }
      }}
    >
      <span>{prefix}</span>
      <span className={styles.zone}>{label}</span>
      <span aria-hidden>·</span>
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        aria-expanded={open}
        aria-controls={panelId}
        // One string: an .sr-only piece led by a space can lose it (failure log #51).
        aria-label={`Change time zone, now ${label}`}
        onClick={() => (open ? close() : setOpen(true))}
      >
        Change
      </button>
      {open && (
        <>
          <span className={styles.backdrop} aria-hidden onClick={() => close(!isPhone)} />
          <Panel id={panelId} sheet={isPhone} onClose={() => close(false)} onKeyDown={onListKey}>
            <Input
              ref={searchRef}
              autoFocus
              aria-label="Search time zones"
              placeholder="Search any city, country or zone"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            {device !== current && !needle && (
              <button type="button" className={styles.device} onClick={() => pick(device)}>
                <Icon name="my_location" size={16} />
                Use my device’s zone ({zoneLabel(device)})
              </button>
            )}
            {/* Mounted empty with the panel, then filled as you type: a region
                inserted with its text already in it is often skipped. */}
            <LiveRegion
              message={
                needle
                  ? {
                      text: list.length ? head : 'No zone matches that. Try a nearby big city.',
                      id: 0,
                    }
                  : null
              }
            />
            <span className={styles.head}>{head}</span>
            <ul ref={listRef} className={styles.list} aria-label="Time zones">
              {list.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    className={styles.option}
                    aria-current={r.id === current ? 'true' : undefined}
                    onClick={() => pick(r.id)}
                  >
                    <span className={styles.optionText}>
                      <span>{r.label}</span>
                      {r.region && <span className={styles.region}>{r.region}</span>}
                    </span>
                    <span className={styles.offset}>{r.offset}</span>
                  </button>
                </li>
              ))}
            </ul>
            {needle && list.length === 0 && (
              <p className={styles.none}>No zone matches that. Try a nearby big city.</p>
            )}
          </Panel>
        </>
      )}
    </span>
  );
}

type PanelProps = {
  id: string;
  sheet: boolean;
  onClose: () => void;
  onKeyDown: (e: KeyboardEvent) => void;
  children: ReactNode;
};

/** A popover on desktop; on phones a bottom sheet, which is a dialog: trapped, scroll locked. */
function Panel({ sheet, ...rest }: PanelProps) {
  return sheet ? <SheetPanel {...rest} /> : <div className={styles.panel} {...panelProps(rest)} />;
}

function SheetPanel({ onClose, ...rest }: Omit<PanelProps, 'sheet'>) {
  const ref = useRef<HTMLDivElement>(null);
  // Focus in, Tab kept inside, Escape, scroll lock, focus back to Change.
  useFocusTrap(ref, onClose);
  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label="Time zone"
      className={styles.panel}
      {...panelProps(rest)}
    />
  );
}

const panelProps = ({ id, onKeyDown, children }: Omit<PanelProps, 'sheet' | 'onClose'>) => ({
  id,
  onKeyDown,
  children,
});
