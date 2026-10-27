'use client';

import { useQuery } from '@tanstack/react-query';
import { ApiError, retryOnce } from './errors';
import { keys } from './keys';
import type { components } from '@/lib/api/generated/schema';
import { api } from './http';

type WireMentorSummary = components['schemas']['AdminMentorsSummaryRead'];

/** The admin Mentors summary as the app reads it (cards, tab counts, the nav badge). */
export type MentorSummary = {
  counts: { applications: number; approved: number; paused: number; notApproved: number };
  longestWaitDays: number | null;
  averageShowUp: number | null;
  atRisk: number;
};

export function toMentorSummary(w: WireMentorSummary): MentorSummary {
  return {
    counts: {
      applications: w.counts.applications,
      approved: w.counts.approved,
      paused: w.counts.paused,
      notApproved: w.counts.not_approved,
    },
    longestWaitDays: w.applications_longest_wait_days,
    averageShowUp: w.approved_average_show_up,
    atRisk: w.at_risk,
  };
}

/**
 * GET /admin/mentors/summary (Admin PRD A2). `adminId` is the
 * signed-in admin, or null for anyone else: a non-admin never asks (the API
 * would answer 404).
 */
export function useAdminSummary(adminId: string | null) {
  return useQuery({
    queryKey: keys.admin.summary(adminId ?? 'none'),
    queryFn: async ({ signal }) => {
      const { data, response } = await api.GET('/api/v1/admin/mentors/summary', { signal });
      if (!response.ok || !data) throw new ApiError(response.status);
      return toMentorSummary(data);
    },
    enabled: adminId !== null,
    retry: retryOnce,
  });
}
