import type { Metadata } from 'next';
import { SESSIONS_COPY } from '@/lib/copy/sessionTypes';
import { SessionTypeFormScreen } from '../_components/SessionTypeFormScreen';

export const metadata: Metadata = {
  title: SESSIONS_COPY.createTitle,
  description: 'Set up a session mentees can book with you.',
};

/** /session-types/new[?template=sop-review] — the create wizard. */
export default async function NewSessionTypePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const template = typeof sp.template === 'string' ? sp.template : null;
  return <SessionTypeFormScreen template={template} />;
}
