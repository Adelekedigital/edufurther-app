import type { Metadata } from 'next';
import { safeReturnTo } from '@/lib/utils/safeReturnTo';
import { AuthScreen } from '../_auth/AuthScreen';

export const metadata: Metadata = {
  title: 'Create your free account',
  robots: { index: false },
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const next = safeReturnTo(typeof sp.next === 'string' ? sp.next : null);
  return <AuthScreen mode="signup" next={next} linkFailed={false} />;
}
