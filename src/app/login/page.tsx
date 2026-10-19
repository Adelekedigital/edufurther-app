import type { Metadata } from 'next';
import { AuthScreen } from '../_auth/AuthScreen';
import { authPageParams } from '../_auth/pageParams';

export const metadata: Metadata = { title: 'Log in', robots: { index: false } };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { role, next, google, deleted } = authPageParams(await searchParams, 'login');
  return <AuthScreen mode="login" role={role} next={next} google={google} deleted={deleted} />;
}
