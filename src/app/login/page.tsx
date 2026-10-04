import type { Metadata } from 'next';
import { safeReturnTo } from '@/lib/utils/safeReturnTo';
import { parseFailureReason } from '../_auth/failureReason';
import { AuthScreen } from '../_auth/AuthScreen';

export const metadata: Metadata = { title: 'Log in', robots: { index: false } };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const next = safeReturnTo(typeof sp.next === 'string' ? sp.next : null);
  return <AuthScreen mode="login" next={next} failure={parseFailureReason(sp.error)} />;
}
