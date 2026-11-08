import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { headers } from 'next/headers';
import { SESSION_HINT_HEADER } from '@/lib/vendor/supabase/server';
import type { SessionState } from '@/lib/vendor/supabase/browser';
import { fontVariables } from './fonts';
import { Providers } from './providers';
import { RouteFocusManager } from './_shell/RouteFocusManager';
import { ServiceWorkerRegistration } from './_shell/ServiceWorkerRegistration';
import { APPLE_STARTUP_IMAGES } from './pwa-splash/sizes';
import '@/styles/globals.css';
import { BRAND_BLUE } from '@/styles/brand';

export const metadata: Metadata = {
  title: { default: 'EduFurther', template: '%s · EduFurther' },
  description: 'Experience-led mentorship for your study-abroad journey.',
  // startupImage: the iPhone's launch screen (logo on white) instead of black.
  appleWebApp: { capable: true, title: 'EduFurther', startupImage: APPLE_STARTUP_IMAGES },
  icons: { apple: '/pwa-icon/192' },
};

export const viewport: Viewport = {
  themeColor: BRAND_BLUE,
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

/** Who the proxy found signed in, so the first paint has the right chrome. */
async function sessionHint(): Promise<SessionState | null> {
  const v = (await headers()).get(SESSION_HINT_HEADER);
  if (v === null) return null;
  return v === 'none' ? { status: 'none' } : { status: 'present', userId: v };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={fontVariables}>
      <body>
        <RouteFocusManager />
        <ServiceWorkerRegistration />
        <Providers session={await sessionHint()}>{children}</Providers>
      </body>
    </html>
  );
}
