import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ADMIN_EMAILS_LIVE } from '@/lib/config/adminEmails';
import { EMAIL_EDITOR } from '@/lib/copy/adminEmails';
import { EmailEditorScreen } from './_components/EmailEditorScreen';
import { safeDecode } from '@/lib/utils/text';

export const metadata: Metadata = { title: EMAIL_EDITOR.pageTitle };

/** /admin/emails/{key}: behind ADMIN_EMAILS_LIVE until the backend routes ship; off, not found. */
export default async function AdminEmailPage({ params }: { params: Promise<{ key: string }> }) {
  if (!ADMIN_EMAILS_LIVE) notFound();
  const { key } = await params;
  // A malformed key reads as not found, never a crash.
  return <EmailEditorScreen emailKey={safeDecode(key) ?? key} />;
}
