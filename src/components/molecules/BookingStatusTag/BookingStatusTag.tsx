import { Tag } from '@/components/atoms/Tag/Tag';
import { outcomeTag } from '@/lib/utils/bookings';

type BookingStatusTagProps = {
  booking: Parameters<typeof outcomeTag>[0];
  now?: Date;
  className?: string;
};

/**
 * How a past session ended (Bookings.dc.html, `historyStatus=tag`), naming who
 * canceled or missed it. The words come from `outcomeTag`, which the details
 * panel's status line reads too, so the two cannot disagree.
 *
 * Draws nothing for a session that is not over — "Upcoming" as a tag would
 * repeat the tab it is sitting in.
 */
export function BookingStatusTag({ booking, now, className }: BookingStatusTagProps) {
  const tag = outcomeTag(booking, now);
  if (!tag) return null;
  return (
    <Tag tone={tag.tone} className={className}>
      {tag.label}
    </Tag>
  );
}
