/**
 * **PENDING BACKEND** — every call and shape the published spec doesn't have
 * yet. One file on purpose: when the client is regenerated, delete what
 * shipped here and `tsc` lists every call site to move onto the typed client.
 * The phase A mock answers these shapes (respond.ts `pendingOk`).
 *
 * Now: Messages (PRD Messages, edufurtherbe PRs 1–3; shapes asked for in
 * docs/handoff/messages-backend-request.md).
 */
import { api } from './http';

/** #3: the completion refusal names what is missing. */
export type PendingIncomplete = { missing?: unknown };

export type PendingResponses = {
  'GET /api/v1/me/messages': WireChats;
  'GET /api/v1/me/messages/unread': { total: number };
  'GET /api/v1/me/messages/people': { data: WireChatPerson[]; next_cursor: null };
  'GET /api/v1/me/messages/settings': WireMessageSettings;
  'PATCH /api/v1/me/messages/settings': WireMessageSettings;
  'GET /api/v1/me/messages/{user_id}': WireThread;
  'POST /api/v1/me/messages/{user_id}': WireMessage;
  'POST /api/v1/me/message-files': WireUploadedFile;
};

/** The generated client without its path types, for the calls above only. */
export const untyped = api as unknown as Record<
  'GET' | 'POST' | 'PATCH',
  (path: string, init?: unknown) => Promise<{ data?: unknown; error?: unknown; response: Response }>
>;

// ---- Messages ---------------------------------------------------------------

/** `PersonRead`: one person shape, shared with booking parties (backend reply). */
export type WireChatPerson = {
  id: string;
  deleted: boolean;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  avatar_focus?: { x: number; y: number } | null;
  cover_color?: string | null;
  degree?: string | null;
  institution: string | null;
  role: 'mentor' | 'mentee';
  /** Mentors only, and only while their profile resolves. */
  handle?: string | null;
  paused: boolean;
};

export type WireNextBooking = { id: string; starts_at: string; session_name: string | null };

export type WireLast = {
  kind: 'text' | 'file';
  text: string | null;
  file_name: string | null;
  mine: boolean;
  at: string;
  deleted: boolean;
};

export type WireChatRow = {
  person: WireChatPerson;
  last: WireLast | null;
  unread: number;
  next_booking: WireNextBooking | null;
};

export type WireChats = { data: WireChatRow[]; next_cursor: null; total_unread: number };

/** The intake file shape (`POST /me/intake-files`), reused for messages. */
export type WireMessageFile = {
  id: string;
  filename: string;
  size: number;
  content_type: string;
};

export type WireMessage = {
  id: string;
  client_id: string | null;
  sender_id: string;
  mine: boolean;
  body: string | null;
  file: WireMessageFile | null;
  sent_at: string;
  edited_at: string | null;
  deleted: boolean;
};

export type WireThread = {
  person: WireChatPerson;
  lock: 'paused' | 'closed' | null;
  next_booking: WireNextBooking | null;
  session_window: boolean;
  items: WireMessage[];
  their_last_read_at: string | null;
  my_last_read_at: string | null;
  has_more: boolean;
};

export type WireMessageSettings = { unread_emails: boolean };

export type WireUploadedFile = {
  file_id: string;
  filename: string;
  size: number;
  content_type: string;
};

/**
 * PENDING BACKEND (Messages PR 2): `can_message` on `GET /mentors/{handle}`,
 * true only for a signed-in mentee connected to this mentor (M0). Absent
 * until it ships, which hides the profile's Message button.
 */
export type PendingProfileFields = { can_message?: boolean };
