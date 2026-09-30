'use client';

import { useEffect, useRef, useState } from 'react';
import type { MentorDefaults } from '@/lib/api/data/sessionTypes';
import type { SavedSessionType } from '@/lib/api/data/sessionTypeEdit';
import type { SavedQuestion } from '@/lib/utils/sessionTypeEdit';
import type { SESSION_TEMPLATES } from '@/lib/utils/sessionTemplates';
import {
  applyTemplateLength,
  blankDraft,
  customFrom,
  draftFromTemplate,
  type Draft,
} from '@/lib/utils/sessionTypeDraft';

/** Editing: the type as saved, and the draft it opens as (EditSessionTypeScreen loads both). */
export type EditTarget = { id: string; saved: SavedSessionType; draft: Draft };
type Template = (typeof SESSION_TEMPLATES)[number];
/** The type as saved, which a save diffs against. */
export type Base = {
  draft: Draft;
  questions: SavedQuestion[];
  windows: SavedSessionType['windows'];
  from: SavedSessionType;
};

/** The mentor's defaults when they couldn't be read: none set, so the platform's. */
const NO_DEFAULTS = {
  durationMin: null,
  noticeHours: null,
  windowDays: null,
  breakMin: null,
  requiresApproval: true,
};
const baseOf = (edit: EditTarget): Base => ({
  draft: edit.draft,
  questions: edit.saved.questions,
  windows: edit.saved.windows,
  from: edit.saved,
});

/**
 * The form's draft, what counts as unchanged (`initial`), and, when editing,
 * the type as saved (`base`).
 */
export function useSessionTypeDraft(
  edit: EditTarget | undefined,
  tmpl: Template | null,
  defaults: { data: MentorDefaults | null | undefined; error: unknown },
) {
  const [initial, setInitial] = useState<Draft>(() =>
    edit ? edit.draft : tmpl ? draftFromTemplate(tmpl) : blankDraft(),
  );
  const [draft, setDraft] = useState<Draft>(initial);
  // Once the mentor's defaults are known (or failed: the platform's), a template
  // whose length isn't theirs starts with its own rules (review of #60). Set
  // during render, once, so it isn't counted as an unsaved change.
  const [templateSettled, setTemplateSettled] = useState(!tmpl);
  if (!templateSettled && (defaults.data || defaults.error)) {
    setTemplateSettled(true);
    const known = defaults.data ?? NO_DEFAULTS;
    const settled = applyTemplateLength(initial, tmpl!.durationMin, known);
    if (settled !== initial) {
      // The baseline moves, so this isn't an unsaved change; what the mentor
      // already typed stays theirs (and still counts as unsaved). Their rules
      // change only if they haven't touched them yet (review r2 of #60).
      setInitial(settled);
      if (draft.rules === initial.rules && draft.durationMin === initial.durationMin)
        setDraft({
          ...draft,
          rules: settled.rules,
          durationMin: settled.durationMin,
          noticeHours: settled.noticeHours,
          windowDays: settled.windowDays,
          breakMin: settled.breakMin,
        });
    }
  }

  // The platform's cap arrives with the defaults: a window above it (the blank
  // draft's 4 weeks, or rules set before they loaded) is brought within it,
  // in the baseline too, so it isn't an unsaved change.
  const cap = defaults.data?.maxWindowDays;
  // Functional updates: they apply on top of a template's settlement queued in
  // the same render, never over it.
  if (cap && (draft.windowDays > cap || initial.windowDays > cap)) {
    setInitial((i) => (i.windowDays > cap ? { ...i, windowDays: cap } : i));
    setDraft((d) => (d.windowDays > cap ? { ...d, windowDays: cap } : d));
  }

  // The type as saved: from the loader, then from each save's own outcome, so a
  // retry diffs against what's really there without waiting for a re-read. A
  // re-read that lands afterwards is the server's word: it replaces this (review of #67).
  const [base, setBase] = useState<Base | null>(() => (edit ? baseOf(edit) : null));
  if (edit && base && base.from !== edit.saved) setBase(baseOf(edit));

  // "Set rules for this session" starts from the mentor's values, the first time.
  const customSeeded = useRef(false);
  // Chosen before the defaults loaded: seeded from them when they arrive.
  const [seedPending, setSeedPending] = useState(false);
  const seedCustom = (patch: Partial<Draft>): Partial<Draft> => {
    let next = patch;
    if (patch.rules === 'custom' && draft.rules !== 'custom' && !customSeeded.current) {
      customSeeded.current = true;
      if (defaults.data) next = { ...customFrom(defaults.data), ...patch };
      else setSeedPending(true);
    }
    if (draft.rules === 'custom') customSeeded.current = true;
    return next;
  };
  if (seedPending && defaults.data) {
    setSeedPending(false);
    const seed = customFrom(defaults.data);
    // Only the rules the mentor hasn't changed since choosing them.
    setDraft((d) => {
      const out = { ...d };
      for (const k of Object.keys(seed) as (keyof typeof seed)[])
        if (d[k] === initial[k]) out[k] = seed[k];
      return out;
    });
  }

  return { draft, setDraft, initial, setInitial, base, setBase, seedCustom };
}

/** Leaving with changes asks first: the browser's own prompt on reload / close. */
export function useLeaveGuard(dirty: boolean) {
  const dirtyRef = useRef(dirty);
  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);
  useEffect(() => {
    const onUnload = (e: BeforeUnloadEvent) => {
      if (!dirtyRef.current) return;
      e.preventDefault();
    };
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, []);
}
