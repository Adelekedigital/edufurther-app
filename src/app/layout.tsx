import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { MATERIAL_SYMBOLS_HREF } from '@/components/atoms/Icon/iconNames';
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

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={fontVariables}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* Material Symbols is not in next/font; subset to our glyphs by icon_names. */}
        <link rel="stylesheet" href={MATERIAL_SYMBOLS_HREF} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
