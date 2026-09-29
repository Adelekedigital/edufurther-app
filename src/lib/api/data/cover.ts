'use client';

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

/** Copy for a failed upload: the server's 413/422 mean the file, not the network. */
export function bannerErrorCopy(e: AppError): string {
  if (e.kind === 'offline') return 'You’re offline. Try again when you’re connected.';
  if (e.status === 413 || e.status === 422)
    return 'That image couldn’t be used. Choose a JPEG, PNG or WebP under 5 MB.';
  return 'The image didn’t upload. Try again.';
}

/**
 * The owner's cover: colour and art (PATCH /users/{id}/profile) and the banner
 * image (POST /users/{id}/banner). Colour and art show at once (optimistic);
 * saves run one at a time in the order picked, so the last pick wins. A failed
 * save refetches the profile, so the page shows what's really saved.
 */
export function useCoverEdit(handle: string, userId: string | null) {
  const session = useSession();
  const qc = useQueryClient();
  const key = keys.mentors.profile(handle, sessionKey(session));
  const update = (fn: (p: MentorProfile) => MentorProfile) =>
    qc.setQueryData<MentorProfile>(key, (p) => (p ? fn(p) : p));

  const save = useMutation({
    scope: { id: `cover:${userId}` },
    mutationFn: async (c: CoverPatch) => {
      if (!userId) throw new Error('No user');
      const { error, response } = await api.PATCH('/api/v1/users/{user_id}/profile', {
        params: { path: { user_id: userId } },
        body: toCoverBody(c),
      });
      if (!response.ok) throw apiError(response.status, error);
    },
    onMutate: async (c) => {
      await qc.cancelQueries({ queryKey: key });
      update((p) => ({
        ...p,
        cover: {
          color: c.color !== undefined ? c.color : p.cover.color,
          art: c.art ?? p.cover.art,
        },
      }));
    },
    onError: () => void qc.invalidateQueries({ queryKey: key }),
  });

  const upload = useMutation({
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
    onSuccess: (url) => update((p) => ({ ...p, bannerUrl: url })),
  });

  return {
    /** Save a colour or art change; shows at once. */
    save: (c: CoverPatch) => save.mutate(c),
    saveState: save.isPending
      ? ('saving' as const)
      : save.isError
        ? ('error' as const)
        : save.isSuccess
          ? ('saved' as const)
          : ('idle' as const),
    /** When the last save finished, so "Saved" can show once per save. */
    savedAt: save.isSuccess ? save.submittedAt : 0,
    upload: (file: File) => upload.mutate(file),
    uploading: upload.isPending,
    uploadError: upload.error ? bannerErrorCopy(normaliseError(upload.error)) : null,
    resetUpload: () => upload.reset(),
  };
}
