import { ErrorScreen } from './_shell/ErrorScreen';

/** Every unknown URL, and every notFound() (Error Page.dc.html, notFound). */
export default function NotFound() {
  return <ErrorScreen type="notFound" />;
}
