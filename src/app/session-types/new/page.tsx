import type { Metadata } from 'next';
import { CreateSessionTypeScreen } from '../_components/CreateSessionTypeScreen';

export const metadata: Metadata = {
  title: 'Create a session type',
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
  return <CreateSessionTypeScreen template={template} />;
}
