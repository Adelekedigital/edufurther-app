import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { components } from '@/lib/api/generated/schema';
import { SAVE_COPY } from '@/lib/copy/settings';
import { SOCIAL_LINKS_COPY as C } from '@/lib/copy/socialLinks';
import { linkedInHandle, linkedInUrl, markLabel, markOf } from '@/lib/utils/socialLinks';
import type { SocialKind } from '@/types/mentor';
import type { SocialRow, SocialSave } from '@/types/mentorSettings';

export type { SocialRow, SocialSave };
import { apiError, ApiError, normaliseError } from './errors';
import { api } from './http';
import { keys } from './keys';
import { patchMe, useMeSlice, type MeRead } from './me';

type LinkRead = components['schemas']['LinkRead'];

export const LINKEDIN_ROW = 'linkedin';

/** The platforms this build knows; a newer backend's extra ones are skipped. */
const KNOWN = new Set<string>(['x', 'youtube', 'instagram', 'facebook', 'tiktok', 'website']);

const linkRow = (l: LinkRead): SocialRow => ({
  id: l.id,
  kind: l.platform,
  value: l.value,
  url: l.url,
  mark: markOf(l.platform, l.url),
});

/**
 * LinkedIn first (`profile.social_linkedin`), then the user's links in their
 * order (backend #507: sorted by position, which can have gaps).
 */
function rowsOf(linkedin: string | null | undefined, links: LinkRead[]): SocialRow[] {
  // A stored value that isn't an /in/ profile (older data) still shows, so it
  // can be changed or removed; its field starts empty.
  const handle = linkedin ? (linkedInHandle(linkedin) ?? '') : null;
  return [
    ...(linkedin && handle !== null
      ? [
          {
            id: LINKEDIN_ROW,
            kind: 'linkedin' as const,
            value: handle,
            url: linkedin,
            mark: 'linkedin' as const,
          },
        ]
      : []),
    ...links
      .filter((l) => KNOWN.has(l.platform))
      .sort((a, b) => a.position - b.position)
      .map(linkRow),
  ];
}

const linksOf = ({ me }: MeRead) => rowsOf(me.profile?.social_linkedin, me.links ?? []);

/**
 * Settings › Social links: LinkedIn and the links, a slice of the one /me
 * (me.ts). Error before content: a failed refetch of a loaded list keeps it.
 */
export function useMyLinks(userId: string | null) {
  const { data, status, retry, retrying } = useMeSlice(userId !== null, linksOf);
  return { rows: data, status, retry, retrying };
}

/** A refused save, in the page's words. */
function saveCopy(e: unknown, kind: SocialKind): string {
  const err = normaliseError(e);
  if (err.kind === 'offline') return SAVE_COPY.profileOffline;
  if (e instanceof ApiError) {
    // LinkedIn is the profile, never "removed elsewhere".
    if (e.status === 404 && kind !== 'linkedin') return C.gone;
    if (e.status === 422) return kind === 'website' ? C.noteWebsite : C.noteHandle(markLabel(kind));
    if (e.status === 409 && e.type?.endsWith('/problems/website-limit-reached'))
      return C.websiteLimit;
    if (e.status === 409 && e.type?.endsWith('/problems/link-platform-taken'))
      return C.taken(markLabel(kind));
  }
  return C.saveFailed;
}

/**
 * Add or change one link, straight away (the design saves each link as it's
 * added: no save bar). LinkedIn writes `social_linkedin` on the profile; the
 * rest are POST /me/links, or PATCH /me/links/{id} for a change (its platform
 * is fixed). The list shows what saved at once; a refetch follows.
 */
export function useSaveSocial(userId: string | null) {
  const qc = useQueryClient();
  // `saved`: what the server now holds, written into the one /me as it is.
  const mutation = useMutation<
    { row: SocialRow; saved: { linkedin: string } | { link: LinkRead } },
    { copy: string },
    SocialSave
  >({
    networkMode: 'always',
    // A /me read already out would land after this with the old list.
    onMutate: () => qc.cancelQueries({ queryKey: keys.viewer.meAll }),
    mutationFn: async ({ kind, value, id }) => {
      try {
        if (!userId) throw new Error('no user');
        if (kind === 'linkedin') {
          const url = linkedInUrl(value.trim());
          const { error, response } = await api.PATCH('/api/v1/users/{user_id}/profile', {
            params: { path: { user_id: userId } },
            // A partial update: only LinkedIn (the generated type lists every field).
            body: { social_linkedin: url } as never,
          });
          if (!response.ok) throw apiError(response.status, error);
          return {
            row: { id: LINKEDIN_ROW, kind, value: value.trim(), url, mark: 'linkedin' },
            saved: { linkedin: url },
          };
        }
        const { data, error, response } = id
          ? await api.PATCH('/api/v1/me/links/{link_id}', {
              params: { path: { link_id: id } },
              body: { value: value.trim() },
            })
          : await api.POST('/api/v1/me/links', {
              body: { platform: kind, value: value.trim() },
            });
        if (!data) throw apiError(response.status, error);
        return { row: linkRow(data), saved: { link: data } };
      } catch (e) {
        throw { copy: saveCopy(e, kind) };
      }
    },
    onSuccess: ({ saved }) => {
      if (!userId) return;
      patchMe(qc, (me) =>
        'linkedin' in saved
          ? { ...me, profile: me.profile && { ...me.profile, social_linkedin: saved.linkedin } }
          : {
              ...me,
              // A change keeps its place; a new one goes last (a read that
              // landed meanwhile may hold it already).
              links: me.links.some((l) => l.id === saved.link.id)
                ? me.links.map((l) => (l.id === saved.link.id ? saved.link : l))
                : [...me.links, saved.link],
            },
      );
      // /me is read again: the one source for the shell, Settings and this list.
      void qc.invalidateQueries({ queryKey: keys.viewer.all });
      // The public profile shows them.
      void qc.invalidateQueries({ queryKey: keys.mentors.all });
    },
    // A refusal may mean the page is out of date (a link removed in another
    // tab, the application gone into review): re-read the viewer and links.
    onError: () => void qc.invalidateQueries({ queryKey: keys.viewer.all }),
  });
  return {
    save: (s: SocialSave) => mutation.mutateAsync(s).then((r) => r.row),
    isPending: mutation.isPending,
    error: mutation.error?.copy ?? null,
    reset: mutation.reset,
  };
}

/** Remove one: LinkedIn clears `social_linkedin`; a link is DELETE /me/links/{id}. */
export function useRemoveSocial(userId: string | null) {
  const qc = useQueryClient();
  const mutation = useMutation<string, { copy: string }, SocialRow>({
    networkMode: 'always',
    onMutate: () => qc.cancelQueries({ queryKey: keys.viewer.meAll }),
    mutationFn: async (row) => {
      try {
        if (!userId) throw new Error('no user');
        const { error, response } =
          row.id === LINKEDIN_ROW
            ? await api.PATCH('/api/v1/users/{user_id}/profile', {
                params: { path: { user_id: userId } },
                body: { social_linkedin: null } as never,
              })
            : await api.DELETE('/api/v1/me/links/{link_id}', {
                params: { path: { link_id: row.id } },
              });
        // Already gone is what was asked for.
        if (!response.ok && response.status !== 404) throw apiError(response.status, error);
      } catch (e) {
        throw {
          copy: normaliseError(e).kind === 'offline' ? SAVE_COPY.profileOffline : C.removeFailed,
        };
      }
      return row.id;
    },
    onSuccess: (gone) => {
      if (!userId) return;
      patchMe(qc, (me) =>
        gone === LINKEDIN_ROW
          ? { ...me, profile: me.profile && { ...me.profile, social_linkedin: null } }
          : { ...me, links: me.links.filter((l) => l.id !== gone) },
      );
      void qc.invalidateQueries({ queryKey: keys.viewer.all });
      void qc.invalidateQueries({ queryKey: keys.mentors.all });
    },
  });
  return {
    remove: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error?.copy ?? null,
    reset: mutation.reset,
  };
}
