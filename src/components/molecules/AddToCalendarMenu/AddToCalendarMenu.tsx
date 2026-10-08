'use client';

import { RowMenu } from '@/components/molecules/RowMenu/RowMenu';
import {
  downloadIcs,
  googleCalendarUrl,
  outlookCalendarUrl,
  type CalendarEvent,
} from '@/lib/utils/calendarLinks';
import { cx } from '@/lib/utils/cx';
import styles from './AddToCalendarMenu.module.css';

const LABEL = 'Add to calendar';

/**
 * Session Join.dc.html's "Add to calendar" link, opening a menu (ours: the
 * design draws a single link): Google Calendar, Outlook.com, or a .ics file
 * for any other calendar (product, 2026-10-08). The two web calendars open in
 * a new tab with the event filled in; the file is made in the browser.
 *
 * A WAI-ARIA menu button, through RowMenu: arrows move, Escape closes and
 * returns focus here.
 */
export function AddToCalendarMenu({
  event,
  onTint,
}: {
  event: CalendarEvent;
  /** On a tinted ground (the lobby's blue or green): the darker blue keeps 4.5:1. */
  onTint?: boolean;
}) {
  const open = (url: string) => window.open(url, '_blank', 'noopener,noreferrer');
  return (
    <RowMenu
      label={LABEL}
      trigger={{
        icon: 'event',
        size: 16,
        text: LABEL,
        align: 'start',
        className: cx(styles.trigger, onTint && styles.onTint),
      }}
      items={[
        {
          key: 'google',
          icon: 'open_in_new',
          label: 'Google Calendar',
          onSelect: () => open(googleCalendarUrl(event)),
        },
        {
          key: 'outlook',
          icon: 'open_in_new',
          label: 'Outlook.com',
          onSelect: () => open(outlookCalendarUrl(event)),
        },
        {
          key: 'ics',
          icon: 'download',
          label: 'Download for other calendars (.ics)',
          onSelect: () => downloadIcs(event),
        },
      ]}
    />
  );
}
