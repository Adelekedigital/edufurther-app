'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { AnswerFile } from '@/types/booking';
import type { AppError } from '@/types/mentor';
import { remote } from './bookings';
import { apiError, retryOnce } from './errors';
import { api } from './http';
import { keys } from './keys';
import { sessionKey, useSession } from './session';

/**
 * What the browser can show itself. Everything else is a download.
 *
 * `as const` rather than a mutable array: this list is the whole of the
 * argument that only a PDF ever reaches the `<object>`, and an exported
 * `string[]` is something a later module could push a scriptable type onto.
 */
export const VIEWABLE = ['application/pdf'] as const;

export function canPreview(file: AnswerFile): boolean {
  return file.available && (VIEWABLE as readonly string[]).includes(file.contentType);
}

/**
 * Every object URL minted for a file id, not just the one on screen.
 *
 * A query function can run more than once for a single open — StrictMode's
 * double mount collects the first attempt with `gcTime: 0` and refetches — and
 * the URL from a run nobody ends up observing is never handed to the component,
 * so the component cannot give it back. Left alone it keeps another user's
 * private document resolvable in our origin for the life of the page. Tracking
 * them by id means closing the viewer releases all of them.
 */
const minted = new Map<string, Set<string>>();

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
      // The URL is minted here, after the await, rather than from the blob
      // during render. A render React computes and then discards would still
      // have minted one, with nothing left to revoke it — and that leaves
      // another user's private document resolvable in our origin for the life
      // of the page. A query function runs once, outside render, when the
      // fetch actually happens.
      const made = URL.createObjectURL(await response.blob());
      const seen = minted.get(id!) ?? new Set<string>();
      seen.add(made);
      minted.set(id!, seen);
      return made;
    },
    gcTime: 0,
    staleTime: Infinity,
    networkMode: 'always',
    retry: retryOnce,
  });

  const url = query.data ?? null;
  // Given back when the viewer closes — all of them, including any a discarded
  // fetch minted. Keyed on the file rather than the URL so a second attempt
  // does not revoke the one currently on screen. With `gcTime: 0` the cache
  // entry goes at the same moment, so a reopen fetches afresh rather than
  // reusing a revoked URL.
  useEffect(() => {
    if (!id) return;
    return () => {
      for (const u of minted.get(id) ?? []) URL.revokeObjectURL(u);
      minted.delete(id);
    };
  }, [id]);

  const { isLoading, error, retry } = remote(query, () => void query.refetch(), enabled);
  return { url, isLoading, error, retry };
}
