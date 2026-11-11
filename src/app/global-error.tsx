'use client';

import { Button, ButtonAnchor } from '@/components/atoms/Button/Button';
import { BrandLogo } from '@/components/atoms/BrandLogo/BrandLogo';
import { ErrorPage } from '@/components/organisms/ErrorPage/ErrorPage';
import { ERROR_PAGE } from '@/lib/copy/errorPage';
import { useErrorReference, type RouteErrorProps } from './_shell/ErrorScreen';
import { fontVariables } from './fonts';
import styles from './global-error.module.css';
import '@/styles/globals.css';

/**
 * A crash in the root layout itself: nothing of the app is left (no shell, no
 * providers, so no viewer), so this is Error Page.dc.html's standalone 500,
 * the plain logo bar and its own <html>, <title> and <main id="main">. Both
 * ways home are full page loads, never client navigation: what crashed may be
 * the app's own client runtime (a stale chunk after a deploy), and a fresh
 * document is what recovers from that.
 */
export default function GlobalError({ error, reset, retry }: RouteErrorProps) {
  const reference = useErrorReference(error);
  return (
    <html lang="en" className={fontVariables}>
      <head>
        <title>{ERROR_PAGE.serverError.title}</title>
      </head>
      <body>
        <ErrorPage
          type="serverError"
          reference={reference}
          landmark
          header={
            <header className={styles.bar}>
              {/* A full page load on purpose (see above), so not next/link. */}
              <a href="/" className={styles.logo}>
                <BrandLogo alt="EduFurther" height={24} width={180} />
              </a>
            </header>
          }
          actions={
            <>
              <Button size="large" onClick={retry ?? reset}>
                {ERROR_PAGE.actions.retry}
              </Button>
              <ButtonAnchor href="/" size="large" variant="secondary-outlined">
                {ERROR_PAGE.actions.site}
              </ButtonAnchor>
            </>
          }
        />
      </body>
    </html>
  );
}
