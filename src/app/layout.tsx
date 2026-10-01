import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { headers } from 'next/headers';
import { SESSION_HINT_HEADER } from '@/lib/vendor/supabase/server';
import type { SessionState } from '@/lib/vendor/supabase/browser';
import { fontVariables } from './fonts';
import { Providers } from './providers';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: { default: 'EduFurther', template: '%s · EduFurther' },
  description: 'Experience-led mentorship for your study-abroad journey.',
  appleWebApp: { capable: true, title: 'EduFurther' },
  icons: { apple: '/pwa-icon/192' },
};

export const viewport: Viewport = {
  themeColor: '#0064ff',
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
        <Providers session={await sessionHint()}>{children}</Providers>
      </body>
    </html>
  );
}
