import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { components } from '@/lib/api/generated/schema';
import { SAVE_COPY } from '@/lib/copy/settings';
import { FREEZE_COPY } from '@/lib/copy/mentorSettings';
import { SOCIAL_LINKS_COPY as C } from '@/lib/copy/socialLinks';
import { linkedInHandle, linkedInUrl, markLabel, markOf } from '@/lib/utils/socialLinks';
import type { SocialKind } from '@/types/mentor';
import type { SocialRow, SocialSave } from '@/types/mentorSettings';

export type { SocialRow, SocialSave };
import { apiError, ApiError, normaliseError, retryOnce } from './errors';
import { api } from './http';
import { keys } from './keys';

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

/** Settings › Social links: one /me read holds LinkedIn and the links. */
export function useMyLinks(userId: string | null) {
  const query = useQuery({
    queryKey: keys.viewer.links(userId ?? 'none'),
    enabled: userId !== null,
    retry: retryOnce,
    queryFn: async ({ signal }): Promise<SocialRow[]> => {
      const { data, error, response } = await api.GET('/api/v1/me', { signal });
      if (!data) throw apiError(response.status, error);
      return rowsOf(data.profile?.social_linkedin, data.links ?? []);
    },
  });
  // Error before content: a failed refetch of a loaded list keeps it.
  const status: 'loading' | 'error' | 'ready' = query.data
    ? 'ready'
    : query.error
      ? 'error'
      : 'loading';
  return {
    rows: query.data ?? null,
    status,
    retry: () => void query.refetch(),
    retrying: query.isFetching,
  };
}

/** A refused save, in the page's words. */
function saveCopy(e: unknown, kind: SocialKind): string {
  const err = normaliseError(e);
  if (err.kind === 'offline') return SAVE_COPY.profileOffline;
  // A stale page while the application is in review: the reason, not "try again".
  if (err.kind === 'inReview' && kind === 'linkedin') return FREEZE_COPY.linkedinLock;
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
  const mutation = useMutation<SocialRow, { copy: string }, SocialSave>({
    networkMode: 'always',
    onMutate: () =>
      userId ? qc.cancelQueries({ queryKey: keys.viewer.links(userId) }) : undefined,
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
          return { id: LINKEDIN_ROW, kind, value: value.trim(), url, mark: 'linkedin' };
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
        return linkRow(data);
      } catch (e) {
        throw { copy: saveCopy(e, kind) };
      }
    },
    onSuccess: (row, { id }) => {
      if (!userId) return;
      qc.setQueryData<SocialRow[]>(keys.viewer.links(userId), (rows = []) =>
        row.kind === 'linkedin'
          ? [row, ...rows.filter((r) => r.id !== LINKEDIN_ROW)]
          : id
            ? rows.map((r) => (r.id === id ? row : r))
            : // A read that landed meanwhile may hold it already.
              [...rows.filter((r) => r.id !== row.id), row],
      );
      // LinkedIn is on /me's profile, which other screens read too.
      void qc.invalidateQueries({
        queryKey: row.kind === 'linkedin' ? keys.viewer.all : keys.viewer.links(userId),
      });
      // The public profile shows them.
      void qc.invalidateQueries({ queryKey: keys.mentors.all });
    },
    // A refusal may mean the page is out of date (a link removed in another
    // tab, the application gone into review): re-read the viewer and links.
    onError: () => void qc.invalidateQueries({ queryKey: keys.viewer.all }),
  });
  return {
    save: mutation.mutateAsync,
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
    onMutate: () =>
      userId ? qc.cancelQueries({ queryKey: keys.viewer.links(userId) }) : undefined,
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
        const kind = normaliseError(e).kind;
        throw {
          copy:
            kind === 'inReview' && row.id === LINKEDIN_ROW
              ? FREEZE_COPY.linkedinLock
              : kind === 'offline'
                ? SAVE_COPY.profileOffline
                : C.removeFailed,
        };
      }
      return row.id;
    },
    onSuccess: (gone) => {
      if (!userId) return;
      qc.setQueryData<SocialRow[]>(keys.viewer.links(userId), (rows = []) =>
        rows.filter((r) => r.id !== gone),
      );
      void qc.invalidateQueries({
        queryKey: gone === LINKEDIN_ROW ? keys.viewer.all : keys.viewer.links(userId),
      });
      void qc.invalidateQueries({ queryKey: keys.mentors.all });
    },
    // A refusal may mean the page is stale (the application went into review
    // elsewhere): re-read the viewer, so LinkedIn locks and the banner shows.
    onError: () => void qc.invalidateQueries({ queryKey: keys.viewer.all }),
  });
  return {
    remove: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error?.copy ?? null,
    reset: mutation.reset,
  };
}
