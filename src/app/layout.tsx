import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { headers } from 'next/headers';
import { SESSION_HINT_HEADER } from '@/lib/vendor/supabase/server';
import type { SessionState } from '@/lib/vendor/supabase/browser';
import { fontVariables } from './fonts';
import { Providers } from './providers';
import { RouteFocusManager } from './_shell/RouteFocusManager';
import { ServiceWorkerRegistration } from './_shell/ServiceWorkerRegistration';
import { InstallNudgeRoot } from './_shell/InstallNudgeRoot';
import { EARLY_CAPTURE } from '@/lib/pwa/earlyPrompt';
import { APPLE_STARTUP_IMAGES } from './pwa-splash/sizes';
import '@/styles/globals.css';
import { BRAND_BLUE } from '@/styles/brand';
import { BRAND_SLOGAN } from '@/lib/copy/brand';
import { siteBase } from '@/lib/config/site';

export const metadata: Metadata = {
  // Absolute og:image and og:url on this environment's own address (SITE_URL).
  metadataBase: siteBase(),
  title: { default: 'EduFurther', template: '%s · EduFurther' },
  description: BRAND_SLOGAN,
  // startupImage: the iPhone's launch screen (logo on white) instead of black.
  appleWebApp: { capable: true, title: 'EduFurther', startupImage: APPLE_STARTUP_IMAGES },
  // Next 16 writes only the unprefixed `mobile-web-app-capable`; iOS reads the
  // launch screens of a home-screen app that declares the Apple one.
  other: { 'apple-mobile-web-app-capable': 'yes' },
  // 180px: the size iOS draws home-screen icons at.
  icons: {
    // The browser tab and search results (there was none: /favicon.ico 404s).
    icon: [
      { url: '/pwa-icon/32', sizes: '32x32', type: 'image/png' },
      { url: '/pwa-icon/48', sizes: '48x48', type: 'image/png' },
    ],
    apple: { url: '/pwa-icon/180', sizes: '180x180' },
  },
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
      <head>
        {/* Android's install prompt can fire before any bundle runs: kept here
            for the install nudge (lib/pwa/earlyPrompt). A fixed string, no input. */}
        <script dangerouslySetInnerHTML={{ __html: EARLY_CAPTURE }} />
      </head>
      <body>
        <RouteFocusManager />
        <ServiceWorkerRegistration />
        <InstallNudgeRoot />
        <Providers session={await sessionHint()}>{children}</Providers>
      </body>
    </html>
  );
}
