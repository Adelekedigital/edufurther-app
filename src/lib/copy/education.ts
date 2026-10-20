/**
 * The degree form's words that depend on who is editing (ProfileItemModal.dc.html
 * `education`). The mentor's are the design's; the mentee's are ours: a mentee
 * has no mentor card (design-divergence.md, Mentee Settings).
 */
export type EducationAudience = 'mentor' | 'mentee';

export const EDUCATION_FIELD_COPY = {
  currentHint: {
    mentor: 'Shown under your name and on your mentor card.',
    mentee: 'Marks the degree you’re studying now or finished most recently.',
  },
  /** Appended when another degree is marked current. */
  replaces: ' Replaces the one currently marked.',
  unticked: 'Leave unticked for earlier degrees. They’ll still appear in your Education list.',
} as const;
