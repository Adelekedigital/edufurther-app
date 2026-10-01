'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AppError, MentorProfile } from '@/types/mentor';
import { BANNER_ACCEPT, bannerProblem } from './cover';
import { apiError, normaliseError } from './errors';
import { api } from './http';
import { keys } from './keys';
import { patchViewer } from './viewer';
import { toFocus } from './mentors';
import { sessionKey, useSession } from './session';

/** What the photo upload accepts: the same as the banner (backend: JPEG, PNG or WebP, 5 MB). */
export const PHOTO_ACCEPT = BANNER_ACCEPT;

/** Copy for a failed photo upload: the server's 413/422 mean the file, not the network. */
export function photoErrorCopy(e: AppError): string {
  if (e.kind === 'offline') return 'You’re offline. Try again when you’re connected.';
  if (e.status === 413 || e.status === 422)
    return 'That image couldn’t be used. Choose a JPEG, PNG or WebP under 5 MB.';
  return 'The photo didn’t upload. Try again.';
}

/** Copy for a failed removal. */
export function photoRemoveErrorCopy(e: AppError): string {
  if (e.kind === 'offline') return 'You’re offline. Try again when you’re connected.';
  return 'The photo wasn’t removed. Try again.';
}

/**
 * The owner's profile photo (POST /users/{id}/avatar, multipart `file`). The
 * server strips the photo's metadata, resizes it and finds the face; its reply
 * carries the new photo and focus, shown at once, then anything listing this
 * mentor (cards) refetches. A file we can tell is wrong is refused before
 * it's sent. The old photo stays until the new one is in.
 */
export function useAvatarUpload(handle: string, userId: string | null) {
  const session = useSession();
  const qc = useQueryClient();
  const key = keys.mentors.profile(handle, sessionKey(session));
  const [fileProblem, setFileProblem] = useState<string | null>(null);
  // Bumped when a photo is in, or gone, for the page to announce it.
  const [uploadedStamp, setUploadedStamp] = useState(0);
  const [removedStamp, setRemovedStamp] = useState(0);

  const upload = useMutation({
    networkMode: 'always',
    mutationFn: async (file: File) => {
      if (!userId) throw new Error('No user');
      const { data, error, response } = await api.POST('/api/v1/users/{user_id}/avatar', {
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
      if (typeof data.avatar_url !== 'string' || !data.avatar_url) throw apiError(500, undefined);
      return data;
    },
    onSuccess: async (data) => {
      // A refetch already out would land after this with the old photo.
      await qc.cancelQueries({ queryKey: key });
      qc.setQueryData<MentorProfile>(key, (p) =>
        p
          ? {
              ...p,
              mentor: {
                ...p.mentor,
                photoUrl: data.avatar_url,
                photoFocus: toFocus(data.avatar_focus),
              },
            }
          : p,
      );
      setUploadedStamp(Date.now());
      // The profile (a refetch the cancel above stopped, e.g. an intro save's)
      // and the cards elsewhere refetch; the server has the new photo by now
      // (review of #99).
      void qc.invalidateQueries({ queryKey: keys.mentors.all });
      // The sidebar avatar reads /me: show the new photo now, and refetch.
      patchViewer(qc, {
        avatarUrl: data.avatar_url,
        avatarFocus: toFocus(data.avatar_focus),
      });
      void qc.invalidateQueries({ queryKey: keys.viewer.all });
    },
  });

  // DELETE /users/{id}/avatar (backend #319): 204, and again when there's
  // none. A 404 means "not yours" (anyone but the owner gets it), so it's a
  // failure, never "removed" (review of PR 125); the profile refetches to the
  // truth. The initials show at once on success, then everything refetches.
  const remove = useMutation({
    networkMode: 'always',
    mutationFn: async () => {
      if (!userId) throw new Error('No user');
      const { error, response } = await api.DELETE('/api/v1/users/{user_id}/avatar', {
        params: { path: { user_id: userId } },
      });
      if (!response.ok) throw apiError(response.status, error);
    },
    onSuccess: async () => {
      await qc.cancelQueries({ queryKey: key });
      qc.setQueryData<MentorProfile>(key, (p) =>
        p ? { ...p, mentor: { ...p.mentor, photoUrl: null, photoFocus: null } } : p,
      );
      setRemovedStamp(Date.now());
      void qc.invalidateQueries({ queryKey: keys.mentors.all });
      patchViewer(qc, { avatarUrl: null, avatarFocus: null });
      void qc.invalidateQueries({ queryKey: keys.viewer.all });
    },
    onError: () => void qc.invalidateQueries({ queryKey: key }),
  });

  return {
    accept: PHOTO_ACCEPT,
    upload: (file: File) => {
      if (upload.isPending) return;
      const problem = bannerProblem(file);
      setFileProblem(problem);
      upload.reset();
      remove.reset();
      if (!problem) upload.mutate(file);
    },
    uploading: upload.isPending,
    remove: () => {
      if (remove.isPending || upload.isPending) return;
      setFileProblem(null);
      upload.reset();
      remove.mutate();
    },
    removing: remove.isPending,
    error:
      fileProblem ??
      (upload.error
        ? photoErrorCopy(normaliseError(upload.error))
        : remove.error
          ? photoRemoveErrorCopy(normaliseError(remove.error))
          : null),
    dismissError: () => {
      setFileProblem(null);
      upload.reset();
      remove.reset();
    },
    uploadedStamp,
    removedStamp,
  };
}
