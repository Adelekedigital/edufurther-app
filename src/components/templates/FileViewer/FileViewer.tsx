'use client';

import { useEffect, useRef, useState } from 'react';
import { Button, ButtonAnchor } from '@/components/atoms/Button/Button';
import { LiveRegion } from '@/components/atoms/LiveRegion/LiveRegion';
import { Spinner } from '@/components/atoms/Spinner/Spinner';
import { EmptyState } from '@/components/molecules/EmptyState/EmptyState';
import { ModalShell } from '@/components/templates/ModalShell/ModalShell';
import { FILE_VIEWER } from '@/lib/copy/files';
import { cx } from '@/lib/utils/cx';
import { canPreview } from '@/lib/utils/files';
import { fileSize } from '@/lib/utils/format';
import type { FileSharer } from '@/types/files';
import type { AppError } from '@/types/mentor';
import styles from './FileViewer.module.css';

const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export type FileViewerProps = {
  /** The original name: the title, and the name the download saves under. */
  name: string;
  contentType: string;
  /** Bytes. */
  size: number;
  /** "Shared by Amara" / "Shared by you" in the subtitle; left out when unknown. */
  sharedBy?: FileSharer;
  /** A `blob:` URL of the fetched bytes: the preview and the download both use it. */
  url: string | null;
  isLoading: boolean;
  error: AppError | null;
  onRetry: () => void;
  /**
   * Why the file can't be opened at all (intake retention): shown in place of
   * the file, with no Download, and nothing is fetched.
   */
  unavailable?: string;
  onClose: () => void;
};

/**
 * FileViewer.dc.html: a shared file, read in the app (intake answers, message
 * files). The point is to read it, not to acquire it: a PDF renders in the
 * browser's own viewer (scroll, zoom, select, print; PRD Q8) and Download
 * sits above it. Word documents get no preview, because no browser can render
 * one, and saying so is better than a blank frame.
 *
 * Presentational: the route-level `FileViewerLauncher` fetches the bytes.
 * Full screen on phones (ModalShell's default).
 */
export function FileViewer({
  name,
  contentType,
  size,
  sharedBy,
  url,
  isLoading,
  error,
  onRetry,
  unavailable,
  onClose,
}: FileViewerProps) {
  const previewable = canPreview({ available: true, contentType });
  const meta = [
    previewable ? FILE_VIEWER.pdf : contentType === DOCX ? FILE_VIEWER.word : FILE_VIEWER.file,
    fileSize(size),
    sharedBy ? FILE_VIEWER.sharedBy(sharedBy) : null,
  ]
    .filter(Boolean)
    .join(' · ');

  // A 404 is removed, or never readable by this account: retrying can't help.
  const gone = unavailable ?? (error?.kind === 'notFound' ? FILE_VIEWER.gone : null);
  const failed = !gone && !!error;
  const ready = !gone && !failed && !isLoading && !!url;
  const loading = !gone && !failed && !ready;

  // "Download it instead" works from every state: pressed before the bytes
  // are here (or after a failure, which it retries), the file saves as soon
  // as they arrive, from the same blob, with no second request.
  // Counted rather than a flag, so the effect never sets state: each press is
  // a request, and the effect saves the requests it hasn't handled yet.
  const [saveRequests, setSaveRequests] = useState(0);
  const handled = useRef(0);
  const anchor = useRef<HTMLAnchorElement>(null);
  const pending = useRef<HTMLButtonElement>(null);
  // The waiting Download button is replaced by the link when the bytes land.
  // A keyboard user on it would fall to <body>, outside the dialog, so focus
  // follows to the link. (Removing a focused node fires no blur, so this
  // stays true through the swap.)
  const downloadFocused = useRef(false);
  useEffect(() => {
    if (!url) return;
    if (downloadFocused.current) anchor.current?.focus();
    if (saveRequests === handled.current) return;
    handled.current = saveRequests;
    anchor.current?.click();
  }, [saveRequests, url]);

  const download = gone ? null : url ? (
    <ButtonAnchor
      ref={anchor}
      variant="primary"
      size="medium"
      icon="download"
      href={url}
      download={name}
    >
      {FILE_VIEWER.download}
    </ButtonAnchor>
  ) : (
    <Button
      ref={pending}
      variant="primary"
      size="medium"
      icon="download"
      onFocus={() => (downloadFocused.current = true)}
      onBlur={() => (downloadFocused.current = false)}
      // Waiting on the bytes it asked for; a failure frees it to ask again.
      busy={saveRequests > 0 && !failed}
      onClick={() => {
        if (failed) onRetry();
        setSaveRequests((n) => n + 1);
      }}
    >
      {FILE_VIEWER.download}
    </Button>
  );

  const noPreview = (
    <EmptyState
      illustration="forms"
      size={120}
      headingLevel={3}
      onTint
      title={FILE_VIEWER.noPreview.title}
      description={FILE_VIEWER.noPreview.body}
    />
  );

  const body = gone ? (
    // An alert, as `failed` is: a removed file must not open in silence.
    <div className={styles.centre} role="alert">
      <p className={styles.note}>{gone}</p>
    </div>
  ) : failed ? (
    <div className={styles.centre} role="alert">
      <EmptyState
        illustration="forms"
        size={120}
        headingLevel={3}
        onTint
        title={FILE_VIEWER.error.title}
        description={FILE_VIEWER.error.body}
      />
    </div>
  ) : loading ? (
    // Announced by the always-mounted LiveRegion below: a status inserted
    // with its text already in it is often skipped.
    <div className={cx(styles.centre, styles.loading)}>
      <Spinner size={32} />
      {FILE_VIEWER.loading}
    </div>
  ) : previewable ? (
    // The browser's own PDF viewer, which is the point: scroll, zoom, select,
    // print, all for free.
    //
    // This is another user's upload, and a blob: URL inherits our origin, so
    // the isolation worth naming is NOT ours: `<object>` takes no `sandbox`,
    // and a sandboxed `<iframe>` cannot load a blob: URL without
    // `allow-same-origin`, which gives the origin straight back. What actually
    // contains an embedded-JS PDF is the browser's viewer (PDFium out of
    // process in Chrome, pdf.js privileged in Firefox), neither of which can
    // reach this document. We rely on that rather than on an attribute that
    // would only look like a mitigation.
    <object
      data={url!}
      // The literal, not contentType: this branch is already gated on
      // canPreview, so the two are provably equal here, and writing it out
      // means a later change to VIEWABLE cannot quietly widen what lands here.
      type="application/pdf"
      className={styles.frame}
      aria-label={name}
    >
      {/* A browser with no built-in PDF viewer (Chrome on Android) shows this. */}
      <div className={styles.centre}>{noPreview}</div>
    </object>
  ) : (
    <div className={styles.centre}>{noPreview}</div>
  );

  return (
    <ModalShell title={name} subtitle={meta} size="xl" onClose={onClose}>
      <div className={styles.viewer}>
        <LiveRegion message={loading ? { text: FILE_VIEWER.loading, id: 1 } : null} />
        {download && <div className={styles.toolbar}>{download}</div>}
        <div className={cx(styles.body, ready && previewable && styles.pdf)}>{body}</div>
        {failed && (
          <Button
            variant="text"
            className={styles.retry}
            onClick={() => {
              // This button leaves with the error; keep focus in the dialog,
              // on the Download that stays while the file loads again.
              pending.current?.focus();
              // A Download the failure swallowed is dropped: Try again alone
              // previews; only a Download pressed now saves.
              handled.current = saveRequests;
              onRetry();
            }}
          >
            {FILE_VIEWER.retry}
          </Button>
        )}
      </div>
    </ModalShell>
  );
}
