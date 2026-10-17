import type { Metadata } from 'next';
import { AuthScreen } from '../_auth/AuthScreen';
import { authPageParams } from '../_auth/pageParams';

export const metadata: Metadata = {
  title: 'Create your free account',
  robots: { index: false },
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { role, next, google } = authPageParams(await searchParams, 'signup');
  return <AuthScreen mode="signup" role={role} next={next} google={google} />;
}
