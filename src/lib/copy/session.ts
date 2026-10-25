/**
 * Session Join copy (Session Join.dc.html, the 19 Oct copy pass with the
 * founder's changes of Oct 21: first names, never pronouns). Reviewed with
 * edufurther-ux-writer; no em dashes.
 */

import type { SupportPerson } from '@/lib/utils/mailto';

export const LOBBY_COPY = {
  /** Under the locked Join button. */
  joinLockedHint: (min: number) => `The button becomes active ${min} minutes before the start.`,
  /** Join again, for someone who has been in. */
  rejoin: 'Rejoin call',
  reschedule: 'Reschedule',
  cancel: 'Cancel',
  /** Between the end and the attendance ruling (the settling phase). */
  settlingNote:
    'You’ve finished this session. We’re confirming who joined. Your booking updates when that’s done.',
} as const;

export const SUPPORT_FOOTER_COPY = {
  lead: 'Having a problem?',
  link: 'Contact support',
} as const;

/**
 * The footer's prefilled email to support (PRD: Frame), for `supportHref`.
 * `when` names its zone ("Mon, Sep 28, 6:00 – 6:30 pm Lagos (WAT)"): the page's
 * switcher may show another zone than the one support would assume.
 */
export function sessionSupportRequest(session: { sessionName: string; when: string }) {
  return {
    subject: (name: string) => `Session: please help (${name})`,
    body: (p: SupportPerson) =>
      [
        'Hi EduFurther team,',
        '',
        'I had a problem with my session.',
        '',
        'What happened:',
        '- ',
        '',
        `Session: ${session.sessionName}, ${session.when}`,
        `Name: ${p.name}`,
        `Role: ${p.mentor ? 'Mentor' : 'Mentee'}`,
        '',
        'Thanks,',
        p.firstName,
      ].join('\n'),
  };
}
