'use client';

import { useQuery } from '@tanstack/react-query';
import { apiError, retryOnce } from './errors';
import { keys } from './keys';
import {
  untyped,
  type WireEmailRecipient,
  type WireEmailSummary,
  type WireEmailValue,
} from './pending';

// Admin Emails (PRD 28). PENDING BACKEND: the calls go through `untyped`
// until the routes are in the published spec.

export type EmailRecipient = WireEmailRecipient;

export type EmailSummary = {
  key: string;
  name: string;
  trigger: string;
  group: string;
  groupName: string;
  templateName: string;
  recipients: EmailRecipient[];
  /** Live: in a shared template that reads our lines. Else Not set up: read only. */
  live: boolean;
  /** Who last changed a line, and when (ISO); null while every line is the default. */
  lastEdited: { by: string; at: string } | null;
};

/** One list card: the emails that share a template, in registry order. */
export type EmailGroup = {
  key: string;
  name: string;
  templateName: string;
  emails: EmailSummary[];
};

export type EmailValue = {
  name: string;
  meaning: string;
  example: string;
  /** Null: no fallback (an empty value stops the send). */
  fallback: string | null;
  usedIn: string[];
};

export function toEmailSummary(w: WireEmailSummary): EmailSummary {
  return {
    key: w.key,
    name: w.name,
    trigger: w.trigger,
    group: w.group,
    groupName: w.group_name,
    templateName: w.template_name,
    recipients: w.recipients,
    live: w.status === 'live',
    lastEdited: w.last_edited ? { by: w.last_edited.admin_name, at: w.last_edited.at } : null,
  };
}

export const toEmailValue = (w: WireEmailValue): EmailValue => ({
  name: w.name,
  meaning: w.meaning,
  example: w.example,
  fallback: w.fallback,
  usedIn: w.used_in,
});

/** Cards in registry order: the API keeps a group's emails together. */
export function groupEmails(emails: readonly EmailSummary[]): EmailGroup[] {
  const groups: EmailGroup[] = [];
  const at = new Map<string, EmailGroup>();
  for (const e of emails) {
    let g = at.get(e.group);
    if (!g) {
      g = { key: e.group, name: e.groupName, templateName: e.templateName, emails: [] };
      at.set(e.group, g);
      groups.push(g);
    }
    g.emails.push(e);
  }
  return groups;
}

/** Every registry email (GET /admin/emails). `adminId` null: not an admin yet, no call. */
export function useAdminEmails(adminId: string | null) {
  return useQuery({
    queryKey: keys.admin.emails(adminId ?? 'none'),
    queryFn: async ({ signal }) => {
      const { data, error, response } = await untyped.GET('/api/v1/admin/emails', { signal });
      if (!response.ok || !data) throw apiError(response.status, error, response);
      return (data as { data: WireEmailSummary[] }).data.map(toEmailSummary);
    },
    enabled: adminId !== null,
    retry: retryOnce,
  });
}

/** The values catalogue (GET /admin/email-values), for the Values tab. */
export function useEmailValues(adminId: string | null) {
  return useQuery({
    queryKey: keys.admin.emailValues(adminId ?? 'none'),
    queryFn: async ({ signal }) => {
      const { data, error, response } = await untyped.GET('/api/v1/admin/email-values', {
        signal,
      });
      if (!response.ok || !data) throw apiError(response.status, error, response);
      return (data as { data: WireEmailValue[] }).data.map(toEmailValue);
    },
    enabled: adminId !== null,
    retry: retryOnce,
  });
}
