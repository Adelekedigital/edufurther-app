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
  /**
   * The page's own <main id="main"> (no app shell around it). Inside the shell
   * (its <main id="main"> is already there) it's a section: one main per page.
   */
  landmark?: boolean;
};

/**
 * Error Page.dc.html: the code above, the DS EmptyState (title as the page's
 * h1), the actions, then the help line with the support address. Presentational:
 * the screen decides the actions and reports the error.
 */
export function ErrorPage({
  type,
  actions,
  reference = null,
  header,
  landmark = false,
}: ErrorPageProps) {
  const copy = ERROR_PAGE[type];
  const email = supportEmail();
  const Root = landmark ? 'main' : 'section';
  const main = (
    <Root className={styles.main} data-screen-label="Error" id={landmark ? 'main' : undefined}>
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
        {copy.help} <a href={`mailto:${email}`}>{email}</a>
        {type === 'serverError' ? ERROR_PAGE.after(reference) : ''}
      </p>
    </Root>
  );
  if (!header) return main;
  return (
    <div className={styles.standalone}>
      {header}
      {main}
    </div>
  );
}
