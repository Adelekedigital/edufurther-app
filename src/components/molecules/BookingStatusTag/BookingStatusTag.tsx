import { Tag } from '@/components/atoms/Tag/Tag';
import { statusTag } from '@/lib/utils/bookings';
import type { BookingStatus } from '@/types/booking';

type BookingStatusTagProps = { status: BookingStatus };

/**
 * How a past session ended (Bookings.dc.html, `historyStatus=tag`). The single
 * place that turns a status into words, so the row, the details panel and any
 * later screen cannot disagree about what `expired` is called.
 *
 * Draws nothing for a session that is not over — "Upcoming" as a tag would
 * repeat the tab it is sitting in.
 */
export function BookingStatusTag({ status }: BookingStatusTagProps) {
  const tag = statusTag(status);
  if (!tag) return null;
  return <Tag tone={tag.tone}>{tag.label}</Tag>;
}
