/**
 * FileViewer (FileViewer.dc.html; PRD Messages, "FileViewer (shared)"): the
 * shared viewer for intake answers and message files. Reviewed against the
 * ux-writer rules.
 */
import type { FileSharer } from '@/types/files';

export const FILE_VIEWER = {
  download: 'Download',
  loading: 'Opening file…',
  pdf: 'PDF',
  word: 'Word document',
  /** Neither: the viewer only names what it knows. */
  file: 'File',
  sharedBy: (sharer: FileSharer) =>
    sharer.mine ? 'Shared by you' : `Shared by ${sharer.firstName}`,
  noPreview: {
    title: 'No preview for this file',
    body: 'Download it to open it on your device.',
  },
  error: {
    title: 'We couldn’t open this file',
    body: 'Check your connection and try again, or download it instead.',
  },
  /** A 404: removed, or never readable by this account. Retrying can't help. */
  gone: 'This file isn’t there anymore.',
  /** Intake answers only: retention removed it after the session. */
  intakeUnavailable:
    'This file is no longer available. Uploads are kept for a while after a session, then removed.',
  retry: 'Try again',
} as const;
