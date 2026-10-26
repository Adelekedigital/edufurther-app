import Link from 'next/link';
import { Notice } from '@/components/molecules/Notice/Notice';
import type { MentorStatus } from '@/lib/api/data/mentorStatus';
import { UNLISTED_COPY } from '@/lib/copy/calendar';
import { NOT_LIVE_COPY } from '@/lib/copy/dashboard';
import { supportMailto } from '@/lib/utils/mailto';

/**
 * A mentor who isn't bookable and has no setup step left: they paused
 * themselves, or EduFurther unlisted them. Says which, in Calendar's words,
 * so Home is never a bare header. Nothing while the status is unknown.
 */
export function NotLiveNotice({
  status,
  firstName,
}: {
  status: MentorStatus | null;
  firstName: string;
}) {
  if (!status) return null;
  if (status.pausedByMentor)
    return (
      <Notice tone="info" icon="info" title={NOT_LIVE_COPY.breakTitle} live={false}>
        {NOT_LIVE_COPY.breakBody} <Link href="/calendar">{NOT_LIVE_COPY.breakLink}</Link>
      </Notice>
    );
  if (status.approved && !status.listed)
    return (
      <Notice tone="info" icon="info" title={UNLISTED_COPY.title} live={false}>
        {UNLISTED_COPY.body}{' '}
        <a
          href={supportMailto(UNLISTED_COPY.subject(firstName), UNLISTED_COPY.mailBody(firstName))}
        >
          {UNLISTED_COPY.contact}
        </a>{' '}
        {UNLISTED_COPY.after}
      </Notice>
    );
  return null;
}
