'use client';

import { Icon } from '@/components/atoms/Icon/Icon';
import type { IconName } from '@/components/atoms/Icon/iconNames';
import { RowMenu } from '@/components/molecules/RowMenu/RowMenu';
import {
  downloadIcs,
  googleCalendarUrl,
  outlookCalendarUrl,
  type CalendarEvent,
} from '@/lib/utils/calendarLinks';
import { cx } from '@/lib/utils/cx';
import { useMediaQuery } from '@/lib/utils/useMediaQuery';
import styles from './AddToCalendarMenu.module.css';

export const ADD_TO_CALENDAR = 'Add to calendar';
const LABEL = ADD_TO_CALENDAR;

type Choice = { key: string; icon: IconName; label: string; run: () => void };

/** The three ways in, shared by the desktop menu and the phone sheet. */
function choices(event: CalendarEvent): Choice[] {
  const open = (url: string) => window.open(url, '_blank', 'noopener,noreferrer');
  return [
    {
      key: 'google',
      icon: 'open_in_new',
      label: 'Google Calendar',
      run: () => open(googleCalendarUrl(event)),
    },
    {
      key: 'outlook',
      icon: 'open_in_new',
      label: 'Outlook.com',
      run: () => open(outlookCalendarUrl(event)),
    },
    {
      key: 'ics',
      icon: 'download',
      label: 'Download for other calendars (.ics)',
      run: () => downloadIcs(event),
    },
  ];
}

/**
 * The same three choices as full-width rows, for the phone sheet the page
 * opens (ours: a menu anchored to a 12px link is hard to hit on a phone, and
 * every other choice on this page opens as a sheet there).
 */
export function AddToCalendarChoices({
  event,
  onDone,
}: {
  event: CalendarEvent;
  /** After a choice: the sheet closes. */
  onDone: () => void;
}) {
  return (
    <ul className={styles.choices}>
      {choices(event).map((c) => (
        <li key={c.key}>
          <button
            type="button"
            className={styles.choice}
            onClick={() => {
              c.run();
              onDone();
            }}
          >
            <Icon name={c.icon} size={20} />
            {c.label}
          </button>
        </li>
      ))}
    </ul>
  );
}

/**
 * Session Join.dc.html's "Add to calendar" link, opening a menu (ours: the
 * design draws a single link): Google Calendar, Outlook.com, or a .ics file
 * for any other calendar (product, 2026-10-08). The two web calendars open in
 * a new tab with the event filled in; the file is made in the browser.
 *
 * A WAI-ARIA menu button, through RowMenu: arrows move, Escape closes and
 * returns focus here. On phones, given `onOpenSheet`, it is a plain button
 * and the page shows `AddToCalendarChoices` in a sheet instead.
 */
export function AddToCalendarMenu({
  event,
  onTint,
  onOpenSheet,
}: {
  event: CalendarEvent;
  /** On a tinted ground (the lobby's blue or green): the darker blue keeps 4.5:1. */
  onTint?: boolean;
  /** Below 768px: open the choices in the page's sheet rather than a menu. */
  onOpenSheet?: () => void;
}) {
  const phone = useMediaQuery('(max-width: 767px)');
  const trigger = cx(styles.trigger, onTint && styles.onTint);
  if (phone && onOpenSheet) {
    return (
      <button type="button" aria-haspopup="dialog" className={trigger} onClick={onOpenSheet}>
        <Icon name="event" size={16} />
        {LABEL}
      </button>
    );
  }
  return (
    <RowMenu
      label={LABEL}
      trigger={{
        icon: 'event',
        size: 16,
        text: LABEL,
        align: 'start',
        className: trigger,
      }}
      items={choices(event).map(({ key, icon, label, run }) => ({
        key,
        icon,
        label,
        onSelect: run,
      }))}
    />
  );
}
