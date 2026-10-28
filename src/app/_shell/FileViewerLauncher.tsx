'use client';

import { FileViewer } from '@/components/templates/FileViewer/FileViewer';
import { FILE_VIEWER } from '@/lib/copy/files';
import { usePrivateFile } from '@/lib/api/data/privateFiles';
import type { FileSharer, ViewedFile } from '@/types/files';

type FileViewerLauncherProps = {
  file: ViewedFile;
  sharedBy?: FileSharer;
  onClose: () => void;
};

/**
 * Opens the shared FileViewer for a private file (an intake answer or a
 * message file), wiring the one fetch, `usePrivateFile`, so every screen
 * opens files the same way. Mount it only while a file is open: the bytes are
 * fetched on mount and their blob URL is given back on unmount.
 */
export function FileViewerLauncher({ file, sharedBy, onClose }: FileViewerLauncherProps) {
  // An unavailable file is never fetched: retention has already removed it.
  const fetched = usePrivateFile(file.available ? file : null);
  return (
    <FileViewer
      name={file.name}
      contentType={file.contentType}
      size={file.size}
      sharedBy={sharedBy}
      url={fetched.url}
      isLoading={fetched.isLoading}
      error={fetched.error}
      onRetry={fetched.retry}
      unavailable={
        file.available
          ? undefined
          : file.kind === 'intake'
            ? FILE_VIEWER.intakeUnavailable
            : FILE_VIEWER.gone
      }
      onClose={onClose}
    />
  );
}
