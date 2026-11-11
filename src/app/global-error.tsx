'use client';

import Link from 'next/link';
import { Button, ButtonLink } from '@/components/atoms/Button/Button';
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
 * the plain logo bar and its own <html>, <title> and <main id="main">.
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
              <Link href="/" className={styles.logo}>
                <BrandLogo alt="EduFurther" height={24} width={180} />
              </Link>
            </header>
          }
          actions={
            <>
              <Button size="large" onClick={retry ?? reset}>
                {ERROR_PAGE.actions.retry}
              </Button>
              <ButtonLink href="/" size="large" variant="secondary-outlined">
                {ERROR_PAGE.actions.site}
              </ButtonLink>
            </>
          }
        />
      </body>
    </html>
  );
}
