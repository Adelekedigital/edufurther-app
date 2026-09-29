'use client';

import { useEffect, useState } from 'react';
import { useMentorReviews, useReviewPrompt } from '@/lib/api/data/reviews';
import {
  useAuthoredReview,
  useMyReview,
  useReviewableSessions,
  useSendReview,
} from '@/lib/api/data/reviewWrite';
import { formatTime } from '@/lib/utils/format';
import type { ReviewAnswers } from '@/types/mentor';
import type { ProfileTab } from './useProfileTab';

type Options = {
  handle: string;
  mentorId: string | null;
  tab: ProfileTab;
  viewerKind: string;
  isOwner: boolean;
  canBook: boolean;
  timeZone: string;
};

/**
 * The Reviews tab's data and the review-writing flow (ReviewModal.dc.html).
 * Writing is a mentee's: mentors can't have had a session as one.
 */
export function useProfileReviewing({
  handle,
  mentorId,
  tab,
  viewerKind,
  isOwner,
  canBook,
  timeZone,
}: Options) {
  const isGuest = viewerKind === 'guest';
  const [filter, setFilter] = useState<string | null>(null);
  const list = useMentorReviews(handle, filter, {
    guest: isGuest,
    active: tab === 'reviews',
    // Guest or not decides what's fetched, so wait until that's known.
    ready: viewerKind !== 'loading',
  });
  // Mentors can't book a first session, so "review after your first session" isn't for them.
  const asMember = tab === 'reviews' && viewerKind === 'member' && !isOwner && canBook;
  const prompt = useReviewPrompt(mentorId, asMember);
  const myReview = useMyReview(mentorId, asMember);
  const reviewable = useReviewableSessions(mentorId, asMember && prompt === 'due');
  const send = useSendReview();
  const [reviewing, setReviewing] = useState<'new' | 'edit' | null>(null);
  const mine = myReview.data;
  // Edit pre-fills from the author's full review; the list row has only step 1.
  const authored = useAuthoredReview(mine?.id ?? null, reviewing === 'edit');
  // The form starts from, and saving compares against, ONE snapshot: a copy
  // fetched after Edit opened (a cached one can predate the last save; review
  // of #59). Taken while rendering, once, when that fresh copy lands.
  const [editOpenedAt, setEditOpenedAt] = useState(0);
  const [editBase, setEditBase] = useState<Partial<ReviewAnswers> | null>(null);
  if (reviewing === 'edit' && !editBase && authored.fetchedAt >= editOpenedAt && authored.data) {
    setEditBase(authored.data.answers);
  }
  const editFailed =
    reviewing === 'edit' && !editBase && authored.failedAt >= editOpenedAt && !!authored.error;
  // "Still editable" is decided now, not when the review was fetched, and the
  // page re-renders at the deadline so Edit goes away on its own.
  const [now, setNow] = useState(() => Date.now());
  const until = mine?.editableUntil ? Date.parse(mine.editableUntil) : 0;
  const mineOpen = until > now;
  useEffect(() => {
    if (!mineOpen) return;
    const t = setTimeout(() => setNow(Date.now()), until - Date.now() + 50);
    return () => clearTimeout(t);
  }, [mineOpen, until]);
  const mineUntil =
    mineOpen && mine?.editableUntil ? formatTime(mine.editableUntil, timeZone) : null;

  const open = (mode: 'new' | 'edit') => {
    send.reset();
    setEditBase(null);
    setEditOpenedAt(Date.now());
    setReviewing(mode);
  };
  const close = () => {
    setReviewing(null);
    setEditBase(null);
    send.reset();
  };

  return {
    isGuest,
    list,
    filter,
    setFilter,
    prompt,
    mine,
    mineOpen,
    mineUntil,
    canWrite: !mineOpen && prompt === 'due' && !!reviewable.data?.length,
    reviewable,
    send,
    /** The modal: 'new', 'edit', or closed. */
    reviewing,
    editBase,
    editLoading: reviewing === 'edit' && !editBase && !editFailed,
    editFailed,
    retryEdit: () => {
      setEditOpenedAt(Date.now());
      authored.retry();
    },
    open,
    close,
  };
}
