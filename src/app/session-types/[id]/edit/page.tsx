import type { Metadata } from 'next';
import { EditSessionTypeScreen } from '../../_components/EditSessionTypeScreen';

export const metadata: Metadata = {
  title: 'Edit session type',
  description: 'Change a session mentees can book with you.',
};

/** /session-types/[id]/edit — the edit wizard (Session Types.dc.html, `editId`). */
export default async function EditSessionTypePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EditSessionTypeScreen id={id} />;
}
