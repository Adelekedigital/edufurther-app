import type { ReactNode } from 'react';
import { EmptyState } from '@/components/molecules/EmptyState/EmptyState';
import { ERROR_PAGE, type ErrorPageType } from '@/lib/copy/errorPage';
import { supportEmail } from '@/lib/config/support';
import styles from './ErrorPage.module.css';

const ART = { notFound: 'search-results', serverError: 'forms' } as const;

export type ErrorPageProps = {
  type: ErrorPageType;
  /** The page's actions (buttons or links), main first; the caller knows where Home is. */
  actions: ReactNode;
  /** serverError: the reference support can look up (null: none to quote). */
  reference?: string | null;
  /**
   * The plain logo bar (Error Page.dc.html `standalone`): only where there is
   * no app shell around the page (a crash in the root layout).
   */
  header?: ReactNode;
};

/**
 * Error Page.dc.html: the code above, the DS EmptyState (title as the page's
 * h1), the actions, then the help line with the support address. Presentational:
 * the screen decides the actions and reports the error.
 */
export function ErrorPage({ type, actions, reference = null, header }: ErrorPageProps) {
  const copy = ERROR_PAGE[type];
  const email = supportEmail();
  const main = (
    <main className={styles.main} data-screen-label="Error">
      <span className={styles.code}>{copy.code}</span>
      <EmptyState
        illustration={ART[type]}
        size={140}
        headingLevel={1}
        title={copy.title}
        description={copy.body}
      />
      <div className={styles.actions}>{actions}</div>
      <p className={styles.help}>
        {copy.help}
        {type === 'serverError' && reference ? ` ${ERROR_PAGE.quote(reference)}` : ''}{' '}
        <a href={`mailto:${email}`}>{email}</a>
      </p>
    </main>
  );
  if (!header) return main;
  return (
    <div className={styles.standalone}>
      {header}
      {main}
    </div>
  );
}
