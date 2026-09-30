'use client';

import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { components } from '@/lib/api/generated/schema';
import type { CoverArt, CoverKey } from '@/lib/utils/cover';
import type { AppError, MentorProfile } from '@/types/mentor';
import { apiError, normaliseError } from './errors';
import { api } from './http';
import { keys } from './keys';
import { sessionKey, useSession } from './session';

type UserProfileWrite = components['schemas']['UserProfileWrite'];

/** A cover change: only the fields given are sent. `color: null` = automatic. */
export type CoverPatch = { color?: CoverKey | null; art?: CoverArt };

/**
 * The PATCH writes only the fields it's sent (backend, 2026-09-29), so a
 * colour pick never touches the timezone or anything else on the profile.
 */
export function toCoverBody(c: CoverPatch): UserProfileWrite {
  const body: UserProfileWrite = {};
  if (c.color !== undefined) body.cover_color = c.color;
  if (c.art !== undefined) body.cover_art = c.art;
  return body;
}

/** What the banner upload accepts (backend: JPEG, PNG or WebP, up to 5 MB). */
export const BANNER_ACCEPT = 'image/jpeg,image/png,image/webp';
export const BANNER_MAX_BYTES = 5 * 1024 * 1024;

/** Why a file can't be a banner, checked before sending it; null when it can. */
export function bannerProblem(file: File): string | null {
  if (!BANNER_ACCEPT.split(',').includes(file.type)) return 'Choose a JPEG, PNG or WebP image.';
  if (file.size === 0) return 'That file is empty. Choose another image.';
  if (file.size > BANNER_MAX_BYTES) return 'Choose an image under 5 MB.';
  return null;
}

/** Copy for a failed removal. */
export function removeErrorCopy(e: AppError): string {
  if (e.kind === 'offline') return 'You’re offline. Try again when you’re connected.';
  return 'The image wasn’t removed. Try again.';
}

/** Copy for a failed upload: the server's 413/422 mean the file, not the network. */
export function bannerErrorCopy(e: AppError): string {
  if (e.kind === 'offline') return 'You’re offline. Try again when you’re connected.';
  if (e.status === 413 || e.status === 422)
    return 'That image couldn’t be used. Choose a JPEG, PNG or WebP under 5 MB.';
  return 'The image didn’t upload. Try again.';
}

/** Where a run of cover saves stands, for the picker's status line. */
export type CoverSaveState = 'idle' | 'saving' | 'saved' | 'error';

type Cover = MentorProfile['cover'];
const applyPatch = (cover: Cover, c: CoverPatch): Cover => ({
  color: c.color !== undefined ? c.color : cover.color,
  art: c.art ?? cover.art,
});

/**
 * The owner's cover: colour and art (PATCH /users/{id}/profile) and the banner
 * image (POST /users/{id}/banner).
 *
 * Colour and art show at once (optimistic) and save one at a time in the order
 * picked. Quick picks form a burst: it keeps the last confirmed cover (what the
 * server has) and, when its last save settles, writes that back, so a refetch
 * that raced a save can't leave an old colour showing. If any save in the
 * burst failed, the burst ends "Not saved" and the profile is refetched
 * (review of #65).
 *
 * Offline, both fail at once (networkMode 'always'): a paused mutation would
 * otherwise send itself on reconnect, after the owner had moved on (review r3
 * of #59). The rollback to the confirmed cover works offline too.
 */
export function useCoverEdit(handle: string, userId: string | null) {
  const session = useSession();
  const qc = useQueryClient();
  const key = keys.mentors.profile(handle, sessionKey(session));
  const mutationKey = ['cover', userId] as const;
  const update = (fn: (p: MentorProfile) => MentorProfile) =>
    qc.setQueryData<MentorProfile>(key, (p) => (p ? fn(p) : p));

  const burst = useRef<{ confirmed: Cover; failed: boolean } | null>(null);
  const [status, setStatus] = useState<{ state: CoverSaveState; stamp: number }>({
    state: 'idle',
    stamp: 0,
  });

  const save = useMutation({
    mutationKey,
    scope: { id: `cover:${userId}` },
    networkMode: 'always',
    mutationFn: async (c: CoverPatch) => {
      if (!userId) throw new Error('No user');
      const { error, response } = await api.PATCH('/api/v1/users/{user_id}/profile', {
        params: { path: { user_id: userId } },
        body: toCoverBody(c),
      });
      if (!response.ok) throw apiError(response.status, error);
    },
    // Runs at once for every pick, even one still queued behind another save.
    onMutate: async (c) => {
      await qc.cancelQueries({ queryKey: key });
      const cover = qc.getQueryData<MentorProfile>(key)?.cover;
      if (!burst.current && cover) burst.current = { confirmed: cover, failed: false };
      setStatus({ state: 'saving', stamp: 0 });
      update((p) => ({ ...p, cover: applyPatch(p.cover, c) }));
    },
    onSuccess: (_d, c) => {
      if (burst.current) burst.current.confirmed = applyPatch(burst.current.confirmed, c);
    },
    onError: () => {
      if (burst.current) burst.current.failed = true;
    },
    onSettled: (_d, error) => {
      // This save still counts as pending here: more than one = more queued.
      if (qc.isMutating({ mutationKey }) > 1) return;
      const b = burst.current;
      burst.current = null;
      if (!b) {
        // No profile in the cache when it started: nothing to put back, but
        // the status still ends (review r2 of #65).
        setStatus({ state: error ? 'error' : 'saved', stamp: Date.now() });
        return;
      }
      update((p) => ({ ...p, cover: b.confirmed }));
      if (b.failed) void qc.invalidateQueries({ queryKey: key });
      setStatus({ state: b.failed ? 'error' : 'saved', stamp: Date.now() });
    },
  });

  // A file we can tell is wrong is refused here, before it's sent; one error
  // source, cleared together.
  const [fileProblem, setFileProblem] = useState<string | null>(null);
  const upload = useMutation({
    networkMode: 'always',
    mutationFn: async (file: File) => {
      if (!userId) throw new Error('No user');
      const { data, error, response } = await api.POST('/api/v1/users/{user_id}/banner', {
        params: { path: { user_id: userId } },
        // The generated type says `file: string`; multipart sends the File itself.
        body: { file: '' },
        bodySerializer: () => {
          const form = new FormData();
          form.append('file', file);
          return form;
        },
      });
      if (!data) throw apiError(response.status, error);
      // The response is exactly {banner_url} (backend, 2026-09-29).
      const url = data.banner_url;
      if (typeof url !== 'string' || !url) throw apiError(500, undefined);
      return url;
    },
    onSuccess: async (url) => {
      // A refetch already out would land after this with the old banner.
      await qc.cancelQueries({ queryKey: key });
      update((p) => ({ ...p, bannerUrl: url }));
      // Refetch what the cancel stopped (e.g. an intro save's); the server has
      // the new banner by now (review of #99).
      void qc.invalidateQueries({ queryKey: key });
    },
  });

  // Remove the image (DELETE /users/{id}/banner, 204, idempotent). The cover
  // shows its colour at once; a failure puts the image back. When it's done,
  // "Image removed" is announced (removedStamp).
  const [removedStamp, setRemovedStamp] = useState(0);
  const remove = useMutation({
    networkMode: 'always',
    mutationFn: async () => {
      if (!userId) throw new Error('No user');
      const { error, response } = await api.DELETE('/api/v1/users/{user_id}/banner', {
        params: { path: { user_id: userId } },
      });
      if (!response.ok) throw apiError(response.status, error);
    },
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: key });
      const before = qc.getQueryData<MentorProfile>(key)?.bannerUrl ?? null;
      update((p) => ({ ...p, bannerUrl: null }));
      return { before };
    },
    onSuccess: async () => {
      // A refetch that raced the DELETE could have put the old image back
      // (review of #70): cancel it, then write the result.
      await qc.cancelQueries({ queryKey: key });
      update((p) => ({ ...p, bannerUrl: null }));
      setRemovedStamp(Date.now());
    },
    onError: (_e, _v, ctx) => {
      // Only if nothing else set an image meanwhile; then ask the server,
      // which may have deleted it before the connection failed.
      if (ctx?.before) update((p) => (p.bannerUrl === null ? { ...p, bannerUrl: ctx.before } : p));
      void qc.invalidateQueries({ queryKey: key });
    },
  });
  // One image change at a time, whoever calls (review of #70).
  const imageBusy = upload.isPending || remove.isPending;
  const removeImage = () => {
    if (imageBusy) return;
    setFileProblem(null);
    upload.reset();
    remove.mutate();
  };

  return {
    /** Save a colour or art change; shows at once. */
    save: (c: CoverPatch) => save.mutate(c),
    /**
     * Pick a cover colour. Over an image, the pick puts the colour on the
     * banner, so the image goes (product, 2026-09-29).
     */
    pickColor: (color: CoverKey) => {
      save.mutate({ color });
      if (qc.getQueryData<MentorProfile>(key)?.bannerUrl) removeImage();
    },
    saveState: status.state,
    /** A new value each time a burst of saves ends, so "Saved" shows once per burst. */
    savedStamp: status.state === 'saved' ? status.stamp : 0,
    upload: (file: File) => {
      if (imageBusy) return;
      const problem = bannerProblem(file);
      setFileProblem(problem);
      upload.reset();
      remove.reset();
      if (!problem) upload.mutate(file);
    },
    uploading: upload.isPending,
    removeImage,
    removing: remove.isPending,
    /** A new value each time a removal succeeds, so "Image removed" is said once. */
    removedStamp,
    /** The last upload's or removal's problem, whichever came last. */
    imageError:
      fileProblem ??
      (upload.error
        ? bannerErrorCopy(normaliseError(upload.error))
        : remove.error
          ? removeErrorCopy(normaliseError(remove.error))
          : null),
    /** Forget the last save's status and any upload error (the picker closed). */
    clearMessages: () => {
      setFileProblem(null);
      // Never a running upload: reopening must still show it, and its error
      // if it fails (review r2 of #65).
      if (!upload.isPending) upload.reset();
      if (!remove.isPending) remove.reset();
      setRemovedStamp(0);
      setStatus((s) => (s.state === 'saving' ? s : { state: 'idle', stamp: 0 }));
    },
  };
}
