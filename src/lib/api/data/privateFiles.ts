'use client';

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { canPreview } from '@/lib/utils/files';
import type { AnswerFile, BookingParty, BookingSide } from '@/types/booking';
import type { FileSharer, PrivateFileKind, ViewedFile } from '@/types/files';
import type { AppError } from '@/types/mentor';
import { remote } from './bookings';
import { apiError, retryOnce } from './errors';
import { api } from './http';
import { keys } from './keys';
import { sessionKey, useSession } from './session';

/** An intake answer's file, as the shared viewer opens it. */
export function intakeViewedFile(file: AnswerFile): ViewedFile {
  return {
    kind: 'intake',
    id: file.id,
    name: file.filename,
    contentType: file.contentType,
    size: file.size,
    available: file.available,
  };
}

/**
 * Who shared an intake file: always the mentee. A mentor reads "Shared by
 * {First}"; the mentee their own "Shared by you". Nothing for a deleted
 * account, whose name is no longer theirs to show.
 */
export function intakeSharer(booking: {
  side: BookingSide;
  other: Pick<BookingParty, 'firstName' | 'deleted'>;
}): FileSharer | undefined {
  if (booking.side === 'mentee') return { mine: true };
  return booking.other.deleted ? undefined : { mine: false, firstName: booking.other.firstName };
}

/**
 * PENDING BACKEND (edufurtherbe Messages PR 2): `GET /api/v1/message-files/{id}`
 * is in the contract (docs/handoff/messages-backend-reply.md) but not yet in
 * the published spec, so it goes through the client without its path types.
 * When the client is regenerated, `tsc` points straight here.
 */
type UntypedGet = (
  path: string,
  init: { params: { path: { file_id: string } }; parseAs: 'stream'; signal: AbortSignal },
) => Promise<{ response: Response }>;

/**
 * The one download for a private file. Both endpoints answer the same way:
 * the bytes as an attachment, bearer token required, `404` to anyone who may
 * not read it (the same as a missing file, so a stranger learns nothing).
 */
async function fetchPrivateFile(
  kind: PrivateFileKind,
  id: string,
  signal: AbortSignal,
): Promise<Response> {
  const init = { params: { path: { file_id: id } }, parseAs: 'stream' as const, signal };
  if (kind === 'intake') return (await api.GET('/api/v1/intake-files/{file_id}', init)).response;
  return (await (api.GET as unknown as UntypedGet)('/api/v1/message-files/{file_id}', init))
    .response;
}

/**
 * Every object URL minted for a file (by kind and id), not just the one on screen.
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
 * Fetches a private file (an intake answer or a message file) and hands back a
 * blob URL.
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
export function usePrivateFile(
  file: Pick<ViewedFile, 'kind' | 'id' | 'available' | 'contentType'> | null,
): FetchedFile {
  const session = useSession();
  const client = useQueryClient();
  // What the bytes are minted as, decided here and not by the response: an
  // `<object>` renders a blob by the blob's own type, which would otherwise
  // be the server's Content-Type. Only a file we preview is ever a PDF; the
  // rest are opaque bytes, so nothing another user uploaded can run as a page
  // in our origin, whatever a header says.
  const mintAs = file && canPreview(file) ? 'application/pdf' : 'application/octet-stream';
  const kind = file?.kind ?? 'intake';
  const id = file?.available ? file.id : null;
  // Minted URLs are tracked per kind and id: the two endpoints' ids are not
  // one namespace, so a bare id could release the wrong file's URL.
  const mintKey = id ? `${kind}:${id}` : null;
  const enabled = !!id && session.status !== 'unknown';
  const who = sessionKey(session);
  const query = useQuery({
    queryKey: keys.privateFile(kind, id ?? '', who),
    enabled,
    queryFn: async ({ signal }) => {
      const response = await fetchPrivateFile(kind, id!, signal);
      if (!response.ok) throw apiError(response.status, null);
      // The URL is minted here, after the await, rather than from the blob
      // during render. A render React computes and then discards would still
      // have minted one, with nothing left to revoke it — and that leaves
      // another user's private document resolvable in our origin for the life
      // of the page. A query function runs once, outside render, when the
      // fetch actually happens.
      const made = URL.createObjectURL(new Blob([await response.blob()], { type: mintAs }));
      const seen = minted.get(mintKey!) ?? new Set<string>();
      seen.add(made);
      minted.set(mintKey!, seen);
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
    if (!mintKey || !id) return;
    return () => {
      for (const u of minted.get(mintKey) ?? []) URL.revokeObjectURL(u);
      minted.delete(mintKey);
      // The entry goes now, not on gcTime's deferred timer: a viewer for the
      // same file mounted in the same commit would otherwise read the URL
      // just revoked (a blank frame, a dead Download) instead of refetching.
      client.removeQueries({ queryKey: keys.privateFile(kind, id, who), exact: true });
    };
  }, [mintKey, client, kind, id, who]);

  const { isLoading, error, retry } = remote(query, () => void query.refetch(), enabled);
  return { url, isLoading, error, retry };
}
