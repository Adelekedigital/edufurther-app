import type { Illustration } from '@/components/molecules/EmptyState/EmptyState';
import type { BookingTab } from '@/types/booking';

export type EmptyCopy = {
  illustration: Illustration;
  title: string;
  description: string;
  /** Where the state sends someone who has nothing yet. */
  action?: { label: string; href: string };
};

/**
 * What each tab says when it holds nothing (Bookings.dc.html).
 *
 * The design wrote the mentor's side only. The mentee's is **provisional** and
 * listed in docs/handoff/bookings-design-request.md — telling a mentee "once a
 * mentee books a session with you" would be worse than holding a blank.
 */
export function emptyFor(tab: BookingTab, isMentor: boolean, filtered: boolean): EmptyCopy {
  if (tab === 'upcoming')
    return isMentor
      ? {
          illustration: 'calendar',
          title: 'No upcoming sessions yet',
          description: 'Once a mentee books a session with you, it will appear here.',
          action: { label: 'Update your availability', href: '/calendar' },
        }
      : {
          illustration: 'calendar',
          title: 'No upcoming sessions yet',
          description: 'Sessions you book with a mentor will appear here.',
          action: { label: 'Find a mentor', href: '/explore' },
        };

  if (tab === 'pending')
    return isMentor
      ? {
          illustration: 'task-templates',
          title: 'No pending requests',
          description: 'Session requests waiting for your confirmation will appear here.',
        }
      : {
          illustration: 'task-templates',
          title: 'No requests waiting',
          description: 'Requests you send that a mentor hasn’t confirmed yet will appear here.',
        };

  return filtered
    ? {
        illustration: 'search-results',
        title: 'No sessions match these filters',
        description: 'Clear a filter to see more of your past sessions.',
      }
    : {
        illustration: 'project-tasks',
        title: 'No past sessions yet',
        description: 'Completed, missed and canceled sessions will be kept here.',
      };
}
