import type { SessionIcon } from '@/types/sessionType';

export type SessionTemplate = {
  /** URL key: /session-types/new?template={key}. */
  key: string;
  name: string;
  icon: SessionIcon;
  description: string;
  /** Catalog offering code (Session Types.dc.html topics re-keyed — design-divergence.md). */
  topic: string;
  durationMin: number;
  questions: { text: string; type: 'free_text' | 'file_upload'; required: boolean }[];
};

/** Session Types.dc.html "Start from a template", values from its `templates` and `sop()`. */
export const SESSION_TEMPLATES: SessionTemplate[] = [
  {
    key: 'sop-review',
    name: 'SOP draft review',
    icon: 'edit_document',
    description:
      'We’ll work through your statement of purpose together, focusing on how your story fits the program and the strength of your opening. You’ll leave with a prioritized revision list and clarity on your next draft.',
    topic: 'application-documents',
    durationMin: 60,
    questions: [
      { text: 'Which programs are you applying to?', type: 'free_text', required: true },
      { text: 'Upload your current SOP draft (PDF or Word)', type: 'file_upload', required: false },
    ],
  },
  {
    key: 'mock-visa-interview',
    name: 'Mock visa interview',
    icon: 'record_voice_over',
    description: 'A realistic practice interview with clear notes on what to tighten.',
    topic: 'visa-and-interview',
    durationMin: 45,
    questions: [{ text: 'Which embassy and interview date?', type: 'free_text', required: true }],
  },
  {
    key: 'program-shortlist',
    name: 'Program shortlist',
    icon: 'school',
    description:
      'Narrow your list to programs that fit your research and fund international students.',
    topic: 'program-selection',
    durationMin: 30,
    questions: [{ text: 'Which programs are you considering?', type: 'free_text', required: true }],
  },
];

/** The card's second line, e.g. "60 min · 2 questions". */
export function templateHint(t: SessionTemplate): string {
  const n = t.questions.length;
  return `${t.durationMin} min · ${n} question${n === 1 ? '' : 's'}`;
}
