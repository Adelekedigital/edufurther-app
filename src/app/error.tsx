'use client';

import { RouteError, type RouteErrorProps } from './_shell/ErrorScreen';

// A crash in a page outside the app shell (sign-in, onboarding, sessions, invite):
// the page brings its own <main id="main">.
export default function RootError(props: RouteErrorProps) {
  return <RouteError {...props} landmark />;
}
