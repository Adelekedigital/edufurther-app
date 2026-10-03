'use client';

import { Button } from '@/components/atoms/Button/Button';
import { Icon } from '@/components/atoms/Icon/Icon';
import { Skeleton } from '@/components/atoms/Skeleton/Skeleton';
import { ModalShell } from '@/components/templates/ModalShell/ModalShell';
import { canPreview, fileSize, useIntakeFile } from '@/lib/api/data/intakeFiles';
import type { AnswerFile } from '@/types/booking';
import styles from './BookingsScreen.module.css';

type IntakeFileViewerProps = {
  file: AnswerFile;
  onClose: () => void;
};

/**
 * A file the mentee answered with, read in the app.
 *
 * The point is to read it, not to acquire it: a PDF renders in the browser's
 * own viewer — scroll, zoom, select, print — and Download sits beside it. The
 * bucket is private, so the bytes are fetched once with the token; the blob URL
 * that produces serves both the preview and the download, which is why saving
 * costs no second request and cannot be eaten by a popup blocker.
 *
 * Word documents get no preview, because no browser can render one. Saying so
 * is better than a blank frame.
 */
export function IntakeFileViewer({ file, onClose }: IntakeFileViewerProps) {
  const previewable = canPreview(file);
  // An unavailable file is never fetched: retention has already removed it.
  const fetched = useIntakeFile(file.available ? file : null);

  const body = !file.available ? (
    <div className={styles.state}>
      <Icon name="description" size={28} />
      <p className={styles.note}>
        This file is no longer available. Uploads are kept for a while after a session, then
        removed.
      </p>
    </div>
  ) : fetched.error ? (
    <div className={styles.state} role="alert">
      <p className={styles.note}>
        {fetched.error.kind === 'offline'
          ? 'You’re offline. Try again when you reconnect.'
          : fetched.error.kind === 'notFound'
            ? 'This file isn’t there any more.'
            : 'We couldn’t open this file.'}
      </p>
      {fetched.error.kind !== 'notFound' && (
        <Button variant="secondary-outlined" size="medium" onClick={fetched.retry}>
          Try again
        </Button>
      )}
    </div>
  ) : fetched.isLoading || !fetched.url ? (
    <Skeleton height="320px" radius="lg" />
  ) : previewable ? (
    // The browser's own PDF viewer, which is the point: scroll, zoom, select,
    // print, all for free.
    //
    // This is another user's upload, and a blob: URL inherits our origin, so
    // the isolation worth naming is NOT ours: `<object>` takes no `sandbox`,
    // and a sandboxed `<iframe>` cannot load a blob: URL without
    // `allow-same-origin`, which gives the origin straight back. What actually
    // contains an embedded-JS PDF is the browser's viewer — PDFium out of
    // process in Chrome, pdf.js privileged in Firefox — neither of which can
    // reach this document. We rely on that rather than on an attribute that
    // would only look like a mitigation.
    <object
      data={fetched.url}
      type={file.contentType}
      className={styles.frame}
      aria-label={file.filename}
    >
      <div className={styles.state}>
        <p className={styles.note}>Your browser can’t show this file here.</p>
      </div>
    </object>
  ) : (
    <div className={styles.state}>
      <Icon name="description" size={28} />
      <p className={styles.note}>
        Word documents can’t be shown here. Download it to read it.
      </p>
    </div>
  );

  return (
    <ModalShell
      title={file.filename}
      subtitle={fileSize(file.size)}
      size="xl"
      icon="description"
      onClose={onClose}
      footer={
        <div className={styles.footer}>
          <span className={styles.meta}>{fileSize(file.size)}</span>
          {fetched.url && (
            <a className={styles.download} href={fetched.url} download={file.filename}>
              <Icon name="download" size={18} />
              Download
            </a>
          )}
        </div>
      }
    >
      {body}
    </ModalShell>
  );
}
