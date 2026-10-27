'use client';

import { useRef } from 'react';
import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type { components, paths } from '@/lib/api/generated/schema';
import { DELETED_NAME } from '@/lib/copy/bookings';
import { entryWording, type CreditKind, type CreditLogType } from '@/lib/copy/adminCredits';
import { coverKey, type CoverKey } from '@/lib/utils/cover';
import { resetsOnFor } from '@/lib/utils/credits';
import { personCover, personInitials } from '@/lib/utils/person';
import { useDebouncedValue } from '@/lib/utils/useDebouncedValue';
import { keyForAttempt } from './booking';
import { toCredits } from './credits';
import { ApiError, apiError, retryOnce } from './errors';
import { api } from './http';
import { keys } from './keys';

type Schemas = components['schemas'];

/** A mentee's balance as the Credits page shows it: "1 of 3", the stage, the reset. */
export type MenteeBalance = {
  left: number;
  /** Rises with the balance ("3 of 3" plus 2 reads "5 of 5"): the API's allowance. */
  total: number;
  stage: 'monthly' | 'starter';
  /** "Nov 1": the next reset, named in UTC as the shell names it. */
  resetsOn: string;
};

export type AdminMentee = {
  id: string;
  /** Q2: the first 8 characters of the UUID. */
  shortId: string;
  name: string;
  firstName: string;
  email: string;
  initials: string;
  cover: CoverKey;
  avatarUrl: string | null;
  balance: MenteeBalance;
};

export type CreditEntry = {
  id: string;
  at: string;
  change: number;
  balanceAfter: number;
  kind: CreditKind;
  menteeId: string;
  menteeName: string;
  /** Deleted since: the entry stays, but there is no one to open. */
  menteeGone: boolean;
  what: string;
  by: string;
};

const fullName = (first?: string | null, last?: string | null) =>
  [first?.trim(), last?.trim()].filter(Boolean).join(' ');

export function toMenteeBalance(c: Schemas['CreditsRead'], now = new Date()): MenteeBalance {
  const credits = toCredits(c);
  const left = Math.max(0, credits.balance);
  return {
    left,
    total: Math.max(c.allowance, left),
    stage: credits.monthly.unlocked ? 'monthly' : 'starter',
    resetsOn: resetsOnFor(credits.nextResetAt, now),
  };
}

export function toAdminMentee(w: Schemas['AdminMenteeRead'], now = new Date()): AdminMentee {
  const name = fullName(w.first_name, w.last_name) || w.email;
  return {
    id: w.user_id,
    shortId: w.user_id.slice(0, 8),
    name,
    firstName: w.first_name?.trim() || name,
    email: w.email,
    initials: personInitials(w.first_name, w.last_name, w.email),
    cover: personCover(w.user_id, coverKey(w.cover_color)),
    avatarUrl: w.avatar_url ?? null,
    balance: toMenteeBalance(w.credits, now),
  };
}

export function toCreditEntry(w: Schemas['CreditEntryRead']): CreditEntry {
  const words = entryWording({
    kind: w.kind,
    refundReason: w.refund_reason ?? null,
    menteeFirstName: w.mentee.first_name?.trim() || null,
    mentorName: w.mentor ? fullName(w.mentor.first_name, w.mentor.last_name) || null : null,
    adminName: w.admin ? fullName(w.admin.first_name, w.admin.last_name) || null : null,
    note: w.note?.trim() || null,
  });
  return {
    id: w.id,
    at: w.at,
    change: w.change,
    balanceAfter: w.balance_after,
    kind: w.kind,
    menteeId: w.mentee.user_id,
    menteeName: fullName(w.mentee.first_name, w.mentee.last_name) || DELETED_NAME,
    menteeGone: !fullName(w.mentee.first_name, w.mentee.last_name),
    what: words.what,
    by: words.by,
  };
}

/**
 * A9 `GET /admin/mentees?q=`, 250ms after typing stops. Empty: the recent
 * mentees (Q3). `adminId` null (not an admin, or /me still loading) asks nothing.
 */
export function useAdminMentees(adminId: string | null, q: string) {
  const term = useDebouncedValue(q.trim(), 250);
  const enabled = adminId !== null;
  const query = useQuery({
    queryKey: keys.admin.mentees(adminId ?? 'none', term),
    queryFn: async ({ signal }) => {
      const { data, error, response } = await api.GET('/api/v1/admin/mentees', {
        params: { query: term ? { q: term } : {} },
        signal,
      });
      if (!data) throw apiError(response.status, error, response);
      return data.data.map((m) => toAdminMentee(m));
    },
    enabled,
    // The last answer stays while the next one loads: the list doesn't blank per keystroke.
    placeholderData: keepPreviousData,
    retry: retryOnce,
  });
  return {
    mentees: query.data ?? [],
    /** What `mentees` answer: the debounced text. */
    term: query.isPlaceholderData ? null : term,
    isLoading: enabled && query.isPending,
    isError: query.isError && !query.data,
    retry: () => void query.refetch(),
  };
}

type HistoryPage = { mentee?: AdminMentee; entries: CreditEntry[]; next: string | null };

/**
 * A10 `GET /admin/mentees/{id}/credits` (the mentee and their newest 50),
 * then older entries from A11 with `mentee_id` and `history_next_cursor`.
 * A 404 (a mentor, a deleted or unknown id) is this panel's error state.
 */
export function useMenteeCredits(adminId: string | null, menteeId: string | null) {
  const enabled = adminId !== null && menteeId !== null;
  const query = useInfiniteQuery({
    queryKey: keys.admin.menteeCredits(adminId ?? 'none', menteeId ?? 'none'),
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam, signal }): Promise<HistoryPage> => {
      if (pageParam === null) {
        const { data, error, response } = await api.GET('/api/v1/admin/mentees/{user_id}/credits', {
          params: { path: { user_id: menteeId! } },
          signal,
        });
        if (!data) throw apiError(response.status, error, response);
        return {
          mentee: toAdminMentee(data.mentee),
          entries: data.history.map(toCreditEntry),
          next: data.history_next_cursor ?? null,
        };
      }
      const page = await readLog({ mentee_id: menteeId!, cursor: pageParam }, signal);
      return { entries: page.entries, next: page.next };
    },
    getNextPageParam: (last) => last.next ?? undefined,
    enabled,
    retry: retryOnce,
  });
  return {
    mentee: query.data?.pages[0]?.mentee ?? null,
    history: query.data?.pages.flatMap((p) => p.entries) ?? [],
    isLoading: enabled && query.isPending,
    isError: query.isError && !query.data,
    retry: () => void query.refetch(),
    ...more(query),
  };
}

type LogQuery = NonNullable<paths['/api/v1/admin/credit-log']['get']['parameters']['query']>;

async function readLog(query: LogQuery, signal: AbortSignal) {
  const { data, error, response } = await api.GET('/api/v1/admin/credit-log', {
    params: { query },
    signal,
  });
  if (!data) throw apiError(response.status, error, response);
  return { entries: data.data.map(toCreditEntry), next: data.next_cursor ?? null };
}

/** A11 `GET /admin/credit-log?type=`, newest first, 50 a page. */
export function useCreditLog(adminId: string | null, type: CreditLogType) {
  const enabled = adminId !== null;
  const query = useInfiniteQuery({
    queryKey: keys.admin.creditLog(adminId ?? 'none', type),
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) =>
      readLog({ type, ...(pageParam ? { cursor: pageParam } : {}) }, signal),
    getNextPageParam: (last) => last.next ?? undefined,
    enabled,
    // Switching chips keeps the rows on screen while the next type loads.
    placeholderData: keepPreviousData,
    retry: retryOnce,
  });
  return {
    entries: query.data?.pages.flatMap((p) => p.entries) ?? [],
    isLoading: enabled && query.isPending,
    isError: query.isError && !query.data,
    retry: () => void query.refetch(),
    ...more(query),
  };
}

/** The "show older" half of an infinite list: only offered when a cursor came back. */
function more(query: {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  isFetchNextPageError: boolean;
  fetchNextPage: () => Promise<unknown>;
}) {
  return {
    hasMore: query.hasNextPage,
    loadingMore: query.isFetchingNextPage,
    loadMoreFailed: query.isFetchNextPageError,
    loadMore: () => void query.fetchNextPage(),
  };
}

export type CreditRules = { starter: number; monthly: number };

/** A12 `GET /admin/credit-rules`: the server's settings, read-only. */
export function useCreditRules(adminId: string | null) {
  const enabled = adminId !== null;
  const query = useQuery({
    queryKey: keys.admin.creditRules(adminId ?? 'none'),
    queryFn: async ({ signal }): Promise<CreditRules> => {
      const { data, error, response } = await api.GET('/api/v1/admin/credit-rules', { signal });
      if (!data) throw apiError(response.status, error, response);
      return { starter: data.starter, monthly: data.monthly };
    },
    enabled,
    retry: retryOnce,
  });
  return {
    rules: query.data ?? null,
    isLoading: enabled && query.isPending,
    // A failed background refetch keeps the rules on screen.
    isError: query.isError && !query.data,
    retry: () => void query.refetch(),
  };
}

export type AddCredits = { menteeId: string; quantity: number; note: string | null };

/**
 * `POST /admin/credits` for one mentee, 1–3 credits, the reason as the note.
 * One Idempotency-Key per attempt: pressing Add again after a timeout re-sends
 * it, so a grant that landed unseen isn't given twice. Resolves once the
 * admin reads have refetched, so the toast and the new balance arrive together.
 */
export function useAddCredits() {
  const queryClient = useQueryClient();
  const attempt = useRef<{ key: string; body: string } | null>(null);
  return useMutation({
    mutationFn: async ({ menteeId, quantity, note }: AddCredits) => {
      const body = { user_ids: [menteeId], quantity, note };
      attempt.current = keyForAttempt(attempt.current, JSON.stringify(body), () =>
        crypto.randomUUID(),
      );
      const { data, error, response } = await api.POST('/api/v1/admin/credits', {
        params: { header: { 'Idempotency-Key': attempt.current.key } },
        body,
      });
      if (!data) throw apiError(response.status, error, response);
      // Named in `unresolved` (deleted since it was picked): nothing landed.
      if (!data.granted.includes(menteeId)) throw new ApiError(404);
      return data;
    },
    onSuccess: async () => {
      attempt.current = null;
      await queryClient.invalidateQueries({ queryKey: keys.admin.all });
    },
    onError: (e) => {
      // Refused outright: the next press is a new attempt. A lost answer keeps the
      // key, and so does 409 (this key is still in flight): a new key could grant twice.
      if (e instanceof ApiError && e.status >= 400 && e.status < 500 && e.status !== 409)
        attempt.current = null;
      void queryClient.invalidateQueries({ queryKey: keys.admin.all });
    },
  });
}
