import { ErrorScreen } from './_shell/ErrorScreen';

/** An unknown URL, outside the app shell (Error Page.dc.html, notFound): its own <main>. */
export default function NotFound() {
  return <ErrorScreen type="notFound" landmark />;
}
