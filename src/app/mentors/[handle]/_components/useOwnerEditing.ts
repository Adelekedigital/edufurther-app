'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';
import { useProfileEdit, type IntroEdit } from '@/lib/api/data/profileEdit';
import type { MentorProfile } from '@/types/mentor';

/**
 * The owner's edit mode on their own profile (Mentor Profile.dc.html): the
 * name-and-headline form ("Edit profile") and the About editor ("Edit").
 * Saving closes the form once the profile has saved; focus returns to the
 * button that opened it.
 */
export function useOwnerEditing(
  profile: MentorProfile | null,
  isOwner: boolean,
  /** "Edit profile": focus returns to it when the form closes. */
  editButton: RefObject<HTMLButtonElement | null>,
) {
  const edit = useProfileEdit(isOwner && profile ? profile.mentor.id : null);
  const [introOpen, setIntroOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const wasOpen = useRef(false);
  useEffect(() => {
    if (wasOpen.current && !introOpen) editButton.current?.focus();
    wasOpen.current = introOpen;
  }, [introOpen, editButton]);

  const introValues: IntroEdit = {
    firstName: profile?.names.first ?? '',
    lastName: profile?.names.last ?? '',
    headline: profile?.headline ?? '',
  };

  return {
    introOpen,
    introValues,
    openIntro: () => {
      edit.resetIntro();
      setIntroOpen(true);
    },
    closeIntro: () => {
      setIntroOpen(false);
      edit.resetIntro();
    },
    saveIntro: (after: IntroEdit) => edit.saveIntro(introValues, after, () => setIntroOpen(false)),
    introSaving: edit.introSaving,
    introErrors: edit.introErrors,

    aboutOpen,
    openAbout: () => {
      edit.resetAbout();
      setAboutOpen(true);
    },
    closeAbout: () => {
      setAboutOpen(false);
      edit.resetAbout();
    },
    saveAbout: (text: string) => edit.saveAbout(text, () => setAboutOpen(false)),
    aboutSaving: edit.aboutSaving,
    aboutError: edit.aboutError,
  };
}
