/**
 * Session Join copy (Session Join.dc.html, the 19 Oct copy pass with the
 * founder's changes of Oct 21: first names, never pronouns). Reviewed with
 * edufurther-ux-writer; no em dashes.
 */

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

export type SessionSupportInput = {
  /** "1:1 call with Gbenga Ogundipe". */
  sessionName: string;
  /** "Mon, Sep 28, 6:00 – 6:30 pm". */
  when: string;
  /** The viewer's full name; their email when there is no name. */
  name: string;
  role: 'mentee' | 'mentor';
};

/** The footer's prefilled email to support (PRD: Frame). */
export function sessionSupportMail({ sessionName, when, name, role }: SessionSupportInput) {
  const first = name.trim().split(/\s+/)[0] ?? name;
  return {
    subject: `Session: please help (${name})`,
    body: [
      'Hi EduFurther team,',
      '',
      'I had a problem with my session.',
      '',
      'What happened:',
      '- ',
      '',
      `Session: ${sessionName}, ${when}`,
      `Name: ${name}`,
      `Role: ${role === 'mentee' ? 'Mentee' : 'Mentor'}`,
      '',
      'Thanks,',
      first,
    ].join('\n'),
  };
}
