'use client';

import Link from 'next/link';
import { Button, ButtonAnchor } from '@/components/atoms/Button/Button';
import { BrandLogo } from '@/components/atoms/BrandLogo/BrandLogo';
import { ErrorPage } from '@/components/organisms/ErrorPage/ErrorPage';
import { ERROR_PAGE } from '@/lib/copy/errorPage';
import { reportErrorOnce } from '@/lib/vendor/errors';
import { fontVariables } from './fonts';
import styles from './global-error.module.css';
import '@/styles/globals.css';

/**
 * A crash in the root layout itself: nothing of the app is left (no shell, no
 * providers, so no viewer), so this is Error Page.dc.html's standalone 500,
 * the plain logo bar and its own <html>. Home is a full page load
 * (ButtonAnchor), in case the app's own navigation is what broke.
 */
export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  const reference = reportErrorOnce(error);
  return (
    <html lang="en" className={fontVariables}>
      <body>
        <ErrorPage
          type="serverError"
          reference={reference}
          header={
            <header className={styles.bar}>
              <Link href="/" className={styles.logo}>
                <BrandLogo alt="EduFurther" height={24} width={180} />
              </Link>
            </header>
          }
          actions={
            <>
              <Button size="large" onClick={reset}>
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
