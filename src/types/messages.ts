import type { CoverKey } from '@/lib/utils/cover';
import type { PhotoFocus } from '@/lib/utils/person';

/** Whether the other person can take messages (PRD Messages, M0 and read-only chats). */
export type ChatPersonState = 'active' | 'paused' | 'closed';

/** The other person in a chat, as every Messages surface reads them. */
export type ChatPerson = {
  /** Their user id: the key for `/messages?with=` and every `/me/messages/{user_id}` call. */
  id: string;
  name: string;
  firstName: string;
  initials: string;
  avatarUrl: string | null;
  avatarFocus: PhotoFocus | null;
  cover: CoverKey;
  role: 'mentor' | 'mentee';
  /** Where they studied, for "{Role} · {institution}" (booking parties' rule). */
  institution: string | null;
  /** Mentors only: their profile is `/mentors/{handle}`. */
  handle: string | null;
  state: ChatPersonState;
};

export type NextBooking = { id: string; startsAt: string; sessionName: string | null };

/** A chat row's last message, already cut by the server. */
export type LastMessage = {
  kind: 'text' | 'file';
  text: string | null;
  fileName: string | null;
  mine: boolean;
  at: string;
  deleted: boolean;
};

export type ChatRow = {
  person: ChatPerson;
  last: LastMessage | null;
  unread: number;
  nextBooking: NextBooking | null;
};

export type Chats = { rows: ChatRow[]; totalUnread: number };

export type MessageFile = { id: string; name: string; sizeBytes: number; contentType: string };

export type Message = {
  id: string;
  clientId: string | null;
  mine: boolean;
  body: string | null;
  file: MessageFile | null;
  sentAt: string;
  editedAt: string | null;
  deleted: boolean;
};

/** Why the composer is replaced by a status line. */
export type ChatLock = 'paused' | 'closed' | null;

export type Thread = {
  person: ChatPerson;
  lock: ChatLock;
  nextBooking: NextBooking | null;
  /** From 15 min before to 15 min after a session between the two starts (M3). */
  sessionWindow: boolean;
  items: Message[];
  theirLastReadAt: string | null;
  myLastReadAt: string | null;
  hasMore: boolean;
};

/** A message this device has written and the server hasn't stored yet. */
export type OutboxStatus = 'sending' | 'waiting' | 'failed';

export type OutboxItem = {
  clientId: string;
  to: string;
  body: string | null;
  file: MessageFile | null;
  createdAt: string;
  status: OutboxStatus;
};

/** Who a Message button writes to (SendMessage's `to`): a chat person's look, from any screen. */
export type MessageRecipient = Pick<
  ChatPerson,
  'id' | 'name' | 'firstName' | 'initials' | 'avatarUrl' | 'avatarFocus' | 'cover' | 'role'
> & { institution: string | null };
