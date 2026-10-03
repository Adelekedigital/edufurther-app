'use client';

import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { AnswerFile } from '@/types/booking';
import type { AppError } from '@/types/mentor';
import { apiError, normaliseError, retryOnce } from './errors';
import { api } from './http';
import { keys } from './keys';
import { sessionKey, useSession } from './session';

/** What the browser can show itself. Everything else is a download. */
export const VIEWABLE = ['application/pdf'];

export function canPreview(file: AnswerFile): boolean {
  return file.available && VIEWABLE.includes(file.contentType);
}

export type FetchedFile = {
  /** A `blob:` URL: good for an `<object>` preview *and* for a download link. */
  url: string | null;
  isLoading: boolean;
  error: AppError | null;
  retry: () => void;
};

/**
 * Fetches an intake file and hands back a blob URL.
 *
 * The bucket is private and the endpoint wants the bearer token, so the file
 * cannot simply be linked: a plain `href` or `<iframe src>` would arrive
 * without the header and 401. One authenticated fetch gets past that, and the
 * blob URL it produces then serves **both** jobs — the browser renders it in
 * an `<object>`, and `<a download>` saves it with no second request and no
 * popup for a blocker to swallow.
 *
 * `gcTime: 0` and the revoke below mean the bytes go as soon as the viewer
 * closes, rather than sitting in the cache for the rest of the session.
 */
export function useIntakeFile(file: AnswerFile | null): FetchedFile {
  const session = useSession();
  const id = file?.available ? file.id : null;
  const enabled = !!id && session.status !== 'unknown';
  const query = useQuery({
    queryKey: keys.intakeFile(id ?? '', sessionKey(session)),
    enabled,
    queryFn: async ({ signal }) => {
      const { response } = await api.GET('/api/v1/intake-files/{file_id}', {
        params: { path: { file_id: id! } },
        parseAs: 'stream',
        signal,
      });
      if (!response.ok) throw apiError(response.status, null);
      return response.blob();
    },
    gcTime: 0,
    staleTime: Infinity,
    networkMode: 'always',
    retry: retryOnce,
  });

  const blob = query.data;
  // Made from the blob rather than set in an effect: creating the URL is the
  // derivation, and the effect below exists only to give it back.
  const url = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob]);
  useEffect(() => {
    if (!url) return;
    return () => URL.revokeObjectURL(url);
  }, [url]);

  return {
    url,
    isLoading: enabled && query.isPending,
    error: query.isError ? normaliseError(query.error) : null,
    retry: () => void query.refetch(),
  };
}

/** "1.2 MB" — the size beside a file's name. */
export function fileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  return kb < 1024 ? `${Math.round(kb)} KB` : `${(kb / 1024).toFixed(1)} MB`;
}
