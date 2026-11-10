'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { LineKey } from '@/lib/utils/emailLines';
import { ApiError, apiError, retryOnce } from './errors';
import { keys } from './keys';
import type { components } from '../generated/schema';
import { api } from './http';

// Admin Emails (PRD 28), on the typed client (backend decision 321).

type S = components['schemas'];
export type WireEmailSummary = S['EmailListItem'];
export type WireEmailValue = S['EmailValueRead'];
export type WireEmailLine = S['EmailLineRead'];
export type WireEmailVariant = S['EmailVariantRead'];
export type WireEmailDetail = S['EmailDetailRead'];
export type WireEmailSave = S['EmailSaveBody'];
export type WireEmailRecipient = WireEmailSummary['recipients'][number];
export type WireLineKey = keyof S['EmailLinesRead'];

/** 409 /problems/email-line-conflict: who saved first (problem members, not in the spec). */
export type WireEmailConflict = { updated_by_name: string; updated_at: string };

/** One of a 422 /problems/email-line-invalid's `errors[]` (it also carries `pointer`, `message`). */
export type WireEmailLineError = {
  line: WireLineKey;
  code: 'empty' | 'unknown_value' | 'value_not_sent' | 'too_long';
  value?: string;
  suggestion?: string;
};

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
      const { data, error, response } = await api.GET('/api/v1/admin/emails', { signal });
      if (!response.ok || !data) throw apiError(response.status, error, response);
      return data.data.map(toEmailSummary);
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
      const { data, error, response } = await api.GET('/api/v1/admin/email-values', { signal });
      if (!response.ok || !data) throw apiError(response.status, error, response);
      return data.data.map(toEmailValue);
    },
    enabled: adminId !== null,
    retry: retryOnce,
  });
}

// ---- One email: the editor ---------------------------------------------------

export type EmailLine = {
  defaultText: string;
  /** What sends now: the admin's text, else the default. */
  text: string;
  edited: boolean;
  /** Sent back on save: another admin's save since gives a 409. */
  version: number;
  /** The default moved since this line was edited: `newDefault` is it. */
  defaultChanged: boolean;
  newDefault: string | null;
};

export type EmailVariant = {
  id: string;
  label: string;
  sample: Record<string, string>;
  sampleRecipient: { name: string; email: string };
  /** Only the lines this variant has (the sign-in code has no button). */
  lines: Partial<Record<LineKey, EmailLine>>;
};

export type EmailDetail = EmailSummary & {
  siblings: number;
  values: Omit<EmailValue, 'usedIn'>[];
  variants: EmailVariant[];
};

const toLine = (w: WireEmailLine): EmailLine => ({
  defaultText: w.default_text,
  text: w.text,
  edited: w.edited,
  version: w.version,
  defaultChanged: w.default_changed,
  newDefault: w.new_default,
});

export function toEmailDetail(w: WireEmailDetail): EmailDetail {
  return {
    ...toEmailSummary(w),
    siblings: w.siblings,
    values: w.values.map((v) => ({
      name: v.name,
      meaning: v.meaning,
      example: v.example,
      fallback: v.fallback,
    })),
    variants: w.variants.map((v) => ({
      id: v.id,
      label: v.label,
      sample: v.sample,
      sampleRecipient: v.sample_recipient,
      lines: Object.fromEntries(
        Object.entries(v.lines).map(([k, l]) => [k, toLine(l!)]),
      ) as EmailVariant['lines'],
    })),
  };
}

export const EMAIL_NOT_FOUND = '/problems/email-not-found';
export const EMAIL_LINE_CONFLICT = '/problems/email-line-conflict';
export const EMAIL_LINE_INVALID = '/problems/email-line-invalid';
export const EMAIL_NOT_SET_UP = '/problems/email-not-set-up';

/** 409: another admin saved this email first. Nothing was written. */
export class EmailConflict extends ApiError {
  constructor(
    readonly updatedByName: string,
    readonly updatedAt: string,
  ) {
    super(409, 'Email line conflict', EMAIL_LINE_CONFLICT);
  }
}

export type EmailLineError = { line: LineKey } & (
  | { code: 'empty' | 'too_long' }
  | { code: 'unknown_value'; value: string; suggestion?: string }
  | { code: 'value_not_sent'; value: string }
);

/** 422: the server's check refused a line. Nothing was written. */
export class EmailLinesInvalid extends ApiError {
  constructor(readonly errors: EmailLineError[]) {
    super(422, 'Email line invalid', EMAIL_LINE_INVALID);
  }
}

function saveError(status: number, body: unknown, response: Response): ApiError {
  const b = (body && typeof body === 'object' ? body : {}) as Partial<WireEmailConflict> & {
    type?: string;
    errors?: WireEmailLineError[];
  };
  if (status === 409 && b.type === EMAIL_LINE_CONFLICT)
    return new EmailConflict(b.updated_by_name ?? '', b.updated_at ?? '');
  if (status === 422 && b.type === EMAIL_LINE_INVALID && Array.isArray(b.errors))
    return new EmailLinesInvalid(
      b.errors.map((e) => ({ ...e, value: e.value ?? '' }) as EmailLineError),
    );
  return apiError(status, body, response);
}

/** GET /admin/emails/{key}. A 404 (`/problems/email-not-found`) is final: no retry. */
export function useAdminEmail(adminId: string | null, key: string) {
  return useQuery({
    queryKey: keys.admin.email(adminId ?? 'none', key),
    queryFn: async ({ signal }) => {
      const { data, error, response } = await api.GET('/api/v1/admin/emails/{key}', {
        params: { path: { key } },
        signal,
      });
      if (!response.ok || !data) throw apiError(response.status, error, response);
      return toEmailDetail(data);
    },
    enabled: adminId !== null,
    retry: retryOnce,
  });
}

export type SaveEmailVariant = {
  variant: string;
  /** All three lines, each with the version read: the backend saves them together. */
  lines: Record<LineKey, { text: string; version: number }>;
  keepEdit: LineKey[];
};

/**
 * PUT /admin/emails/{key}/variants/{variant}. The reply is the whole email, so
 * it replaces the cache and the list refreshes (Last edited). A refusal
 * refetches nothing: on a 409 the admin's draft stays until they reload.
 */
export function useSaveEmailVariant(adminId: string | null, key: string) {
  const qc = useQueryClient();
  return useMutation<EmailDetail, unknown, SaveEmailVariant>({
    mutationFn: async ({ variant, lines, keepEdit }) => {
      const body: WireEmailSave = { lines, ...(keepEdit.length ? { keep_edit: keepEdit } : {}) };
      const { data, error, response } = await api.PUT(
        '/api/v1/admin/emails/{key}/variants/{variant}',
        { params: { path: { key, variant } }, body },
      );
      if (!response.ok || !data) throw saveError(response.status, error, response);
      return toEmailDetail(data);
    },
    onSuccess: (email) => {
      const me = adminId ?? 'none';
      qc.setQueryData(keys.admin.email(me, key), email);
      void qc.invalidateQueries({ queryKey: keys.admin.emails(me) });
    },
  });
}
