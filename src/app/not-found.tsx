import { ErrorScreen } from './_shell/ErrorScreen';
import { EnsureProviders } from './_shell/EnsureProviders';

/** An unknown URL, outside the app shell (Error Page.dc.html, notFound): its own <main>. */
export default function NotFound() {
  return (
    <EnsureProviders>
      <ErrorScreen type="notFound" landmark />
    </EnsureProviders>
  );
}
