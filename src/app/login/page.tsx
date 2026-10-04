import type { Metadata } from 'next';
import { safeReturnTo } from '@/lib/utils/safeReturnTo';
import { AuthScreen, type AuthFailureReason } from '../_auth/AuthScreen';

export const metadata: Metadata = { title: 'Log in', robots: { index: false } };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const next = safeReturnTo(typeof sp.next === 'string' ? sp.next : null);
  return <AuthScreen mode="login" next={next} failure={failureReason(sp.error)} />;
}

const REASONS: AuthFailureReason[] = ['link', 'google_cancelled', 'google_failed'];

/** Only our own reasons; anything else in the URL is ignored. */
function failureReason(error: string | string[] | undefined) {
  return REASONS.find((r) => r === error);
}
