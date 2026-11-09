'use client';

import Link from 'next/link';
import { Skeleton } from '@/components/atoms/Skeleton/Skeleton';
import { EmptyState } from '@/components/molecules/EmptyState/EmptyState';
import { useAdminEmail, useEmailValues, useSaveEmailVariant } from '@/lib/api/data/adminEmails';
import { ApiError } from '@/lib/api/data/errors';
import { viewStatus } from '@/lib/api/data/queryStatus';
import { useViewer } from '@/lib/api/data/viewer';
import { EMAIL_EDITOR as C } from '@/lib/copy/adminEmails';
import { AdminLoadError } from '../../../_components/AdminLoadError';
import { EmailEditor } from './EmailEditor';
import styles from './EmailEditorScreen.module.css';

/**
 * /admin/emails/{key} (PRD 28 "Edit an email"): the only place this email is
 * fetched and saved. The catalogue is loaded too, so a value that isn't this
 * email's reads "isn't sent with", not "isn't a value we know".
 */
export function EmailEditorScreen({ emailKey }: { emailKey: string }) {
  const viewer = useViewer();
  const adminId = viewer.kind === 'member' && viewer.isAdmin ? viewer.id : null;
  const email = useAdminEmail(adminId, emailKey);
  const catalogue = useEmailValues(adminId);
  const save = useSaveEmailVariant(adminId, emailKey);
  const status = viewStatus(email);

  if (status === 'loading')
    return (
      <div className={styles.loading} role="status" aria-busy="true" aria-label={C.loading}>
        <Skeleton width="96px" height="16px" radius="sm" />
        <Skeleton width="240px" height="28px" radius="sm" />
        <Skeleton width="60%" height="12px" radius="sm" />
        <Skeleton width="100%" height="320px" radius="xl" />
      </div>
    );

  if (status === 'error') {
    const gone = email.error instanceof ApiError && email.error.status === 404;
    return gone ? (
      <div className={styles.state}>
        <EmptyState
          illustration="search-results"
          size={120}
          headingLevel={1}
          title={C.notFound.title}
          description={C.notFound.body}
          actions={
            <Link href="/admin/emails" prefetch={false} className={styles.backLink}>
              {C.back}
            </Link>
          }
        />
      </div>
    ) : (
      <AdminLoadError
        framed
        illustration="inbox"
        headingLevel={1}
        title={C.error.title}
        body={C.error.body}
        retryLabel={C.error.retry}
        onRetry={() => void email.refetch()}
        retrying={email.isFetching}
      />
    );
  }

  return (
    <EmailEditor
      key={emailKey}
      email={email.data!}
      known={catalogue.data?.map((v) => v.name) ?? null}
      save={(v) => save.mutateAsync(v)}
      saving={save.isPending}
      onReload={async () => !(await email.refetch()).isError}
    />
  );
}
