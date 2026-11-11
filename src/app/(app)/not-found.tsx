import { ErrorScreen } from '@/app/_shell/ErrorScreen';

/**
 * notFound() inside the app shell (a non-admin on /admin, a denied preview):
 * the 404 in the shell's own <main id="main">, never a second one.
 */
export default function NotFound() {
  return <ErrorScreen type="notFound" />;
}
