import type { AdminMentorRow, MentorTab } from '@/lib/api/data/adminMentors';
import { MENTOR_CSV as H, MENTOR_TAB_LABELS, MENTOR_TABLE } from '@/lib/copy/adminMentors';
import { csvFilename, type CsvColumn } from '@/lib/utils/csv';
import { dayKey } from '@/lib/utils/slots';
import { tierWord } from './mentorLines';

type Col = CsvColumn<AdminMentorRow>;

/**
 * Each tab's CSV columns: the table's columns as plain values (a date a
 * spreadsheet sorts, a number it sums), plus the detail a cell only hints at.
 */
export function mentorCsvColumns(tab: MentorTab, zone: string): Col[] {
  const day = (iso: string | null) => (iso ? dayKey(iso, zone) : '');
  const who: Col[] = [
    { header: H.name, value: (m) => m.name },
    { header: H.email, value: (m) => m.email },
  ];
  if (tab === 'applications')
    return [
      ...who,
      { header: H.applied, value: (m) => day(m.submittedAt) },
      { header: H.waitingDays, value: (m) => m.waitingDays },
      { header: H.school, value: (m) => m.school?.name },
      { header: H.schoolCountry, value: (m) => m.school?.country },
    ];
  if (tab === 'approved')
    return [
      ...who,
      { header: H.approved, value: (m) => day(m.approvedAt) },
      { header: H.completed, value: (m) => m.completed },
      { header: H.upcoming, value: (m) => m.upcoming },
      { header: H.showUpRate, value: (m) => m.showUpRate },
      { header: H.showUpTier, value: (m) => tierWord(m.showUpTier) },
    ];
  if (tab === 'paused')
    return [
      ...who,
      {
        header: H.status,
        value: (m) =>
          m.pausedBy === 'mentor' ? MENTOR_TABLE.pausedByMentor : MENTOR_TABLE.suspended,
      },
      { header: H.since, value: (m) => day(m.pausedAt) },
      { header: H.reason, value: (m) => (m.pausedBy === 'mentor' ? '' : m.pausedReason) },
    ];
  return [
    ...who,
    { header: H.decided, value: (m) => day(m.decidedAt) },
    { header: H.comment, value: (m) => m.declineReason },
    { header: H.applied, value: (m) => day(m.submittedAt) },
  ];
}

/** `edufurther-mentors-approved-2026-11-17.csv`, dated in the admin's zone. */
export const mentorCsvFilename = (tab: MentorTab, zone: string, now = new Date()) =>
  csvFilename(['mentors', MENTOR_TAB_LABELS[tab]], dayKey(now.toISOString(), zone));
