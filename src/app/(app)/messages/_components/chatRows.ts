import { LIST_COPY } from '@/lib/copy/messages';
import { formatNextAvailable } from '@/lib/utils/format';
import { rowTime } from '@/lib/utils/messageTime';
import type { ChatPerson, ChatRow } from '@/types/messages';

export type ChatFilter = 'all' | 'unread';

/** "{Role} · {institution}", or the role alone when we don't know where they studied. */
export function personLine(p: ChatPerson): string {
  const role = LIST_COPY.role(p.role);
  return p.institution ? `${role} · ${p.institution}` : role;
}

/**
 * The row's preview (PRD "Preview", Q9): the last text, "Sent a file: {name}"
 * for a file alone, "You: " first when it's mine; a deleted one reads as
 * deleted; no messages yet says so.
 */
export function previewOf(row: ChatRow): string {
  const last = row.last;
  if (!last) return LIST_COPY.noMessages;
  if (last.deleted) return last.mine ? LIST_COPY.deletedMine : LIST_COPY.deletedTheirs;
  const body =
    last.text?.trim() || (last.fileName ? LIST_COPY.sentFile(last.fileName) : LIST_COPY.noMessages);
  return last.mine ? `${LIST_COPY.you}${body}` : body;
}

export type RowView = {
  id: string;
  person: ChatPerson;
  name: string;
  /** Empty with no messages: the design draws no time then. */
  time: string;
  sub: string;
  preview: string;
  unread: number;
  /** "Next: {when}", or null when nothing is upcoming. */
  chip: string | null;
  /** The row's accessible name: "{Name}, {n} unread". */
  label: string;
};

export function rowView(row: ChatRow, timeZone: string, now = new Date()): RowView {
  return {
    id: row.person.id,
    person: row.person,
    name: row.person.name,
    time: row.last ? rowTime(row.last.at, timeZone, now) : '',
    sub: personLine(row.person),
    preview: previewOf(row),
    unread: row.unread,
    chip: row.nextBooking
      ? LIST_COPY.next(formatNextAvailable(row.nextBooking.startsAt, timeZone, now))
      : null,
    label: LIST_COPY.rowName(row.person.name, row.unread),
  };
}

/**
 * The rows the list shows: a search on name and institution, as typed, in the
 * browser; then the Unread filter, which keeps `keepId` (the chat opened from
 * it) after it's read, until the filter changes (PRD "Details as drawn").
 */
export function visibleRows(
  rows: ChatRow[],
  q: string,
  filter: ChatFilter,
  keepId: string | null,
): ChatRow[] {
  const needle = q.trim().toLowerCase();
  return rows.filter((r) => {
    if (needle) {
      const hay = `${r.person.name} ${r.person.institution ?? ''}`.toLowerCase();
      if (!hay.includes(needle)) return false;
    }
    return filter === 'all' || r.unread > 0 || r.person.id === keepId;
  });
}

/** Which "no rows" state a filtered-empty list shows, or null when there are rows. */
export function noRowsKind(
  shown: number,
  q: string,
  filter: ChatFilter,
): 'unread' | 'search' | null {
  if (shown > 0) return null;
  return filter === 'unread' && !q.trim() ? 'unread' : 'search';
}
