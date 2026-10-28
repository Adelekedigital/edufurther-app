'use client';

import { useRouter } from 'next/navigation';
import { RowMenu, type RowMenuItem } from '@/components/molecules/RowMenu/RowMenu';
import { CHAT_COPY, REPORT_REQUEST } from '@/lib/copy/messages';
import { supportHref } from '@/lib/utils/mailto';
import type { ChatPerson, NextBooking } from '@/types/messages';
import { profileHref } from './ChatHeader';

/** Who is reporting: their name and account email, for the support email's sign-off. */
export type Reporter = { name: string; email: string; mentor: boolean };

/** The chat's address for support: this app's origin, then `/messages?with={id}`. */
export function chatUrl(personId: string, origin: string): string {
  return `${origin}/messages?with=${encodeURIComponent(personId)}`;
}

/** Report (v1): a prefilled email to support (PRD "Report"). */
export function reportHref(person: ChatPerson, me: Reporter, origin: string): string {
  return supportHref(me, {
    subject: REPORT_REQUEST.subject,
    body: REPORT_REQUEST.body(
      { name: person.name, mentor: person.role === 'mentor' },
      chatUrl(person.id, origin),
    ),
  });
}

/**
 * "More options" (Messages.dc.html header menu, `safety` v1): View profile
 * (a mentee viewing a mentor, Q3), View booking (phones, while one is
 * upcoming; desktop shows it in the subline), then Report after a divider.
 * Block isn't built (later).
 */
export function ChatMenu({
  person,
  nextBooking,
  viewerIsMentee,
  phone,
  reporter,
}: {
  person: ChatPerson;
  nextBooking: NextBooking | null;
  viewerIsMentee: boolean;
  phone: boolean;
  reporter: Reporter;
}) {
  const router = useRouter();
  const profile = profileHref(person, viewerIsMentee);
  const items: RowMenuItem[] = [
    ...(profile
      ? [
          {
            key: 'profile',
            icon: 'person' as const,
            label: CHAT_COPY.viewProfile,
            onSelect: () => router.push(profile),
          },
        ]
      : []),
    ...(phone && nextBooking
      ? [
          {
            key: 'booking',
            icon: 'event' as const,
            label: CHAT_COPY.viewBooking,
            onSelect: () =>
              router.push(`/bookings?tab=upcoming&booking=${encodeURIComponent(nextBooking.id)}`),
          },
        ]
      : []),
    {
      key: 'report',
      icon: 'flag',
      label: CHAT_COPY.report,
      // A divider only when something sits above it.
      divider: !!profile || (phone && !!nextBooking),
      onSelect: () => {
        window.location.href = reportHref(person, reporter, window.location.origin);
      },
    },
  ];
  return (
    <RowMenu label={CHAT_COPY.more} items={items} trigger={{ icon: 'more_vert', ring: true }} />
  );
}
