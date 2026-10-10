import { NextResponse } from 'next/server';

/**
 * MOCK of GET /api/v1/sessions/{id}/answers: one entry per question the form
 * ASKED, in form order — answered or not (backend #412). Keyed off the mock
 * session ids so each shape is reachable: free text, a choice list, a file, a
 * retired question, blanks, an all-blank form, and the empty case.
 * ENABLE_MOCK_API=1 only.
 */
const FORMS: Record<string, unknown[]> = {
  // The join page's on-the-clock session (users/[userId]/sessions `j-1`).
  'j-1': [
    {
      question_id: 'q1',
      question_text: 'What would you like to talk about?',
      question_type: 'free_text',
      retired: false,
      answered: true,
      required: false,
      text: 'I’m applying to PhD programs in public health for Fall 2027 and don’t know how to pick between funded and unfunded offers.',
      options: [],
      file: null,
    },
    {
      question_id: 'q2',
      question_text: 'Which area do you want help with?',
      question_type: 'multi_choice',
      retired: false,
      answered: true,
      required: false,
      text: null,
      options: [{ id: 'o1', text: 'School selection' }],
      file: null,
    },
  ],
  // A form nobody filled in. Its row carries no `answers_preview` at all,
  // because that counts answered questions only and is null at zero — so the
  // panel is the first place this booking mentions the form.
  // Both mentee-side rows with no preview, so whichever is on screen shows
  // the all-blank panel.
  'u-8': [

    {
      question_id: 'q1',
      question_text: 'What would you like to talk about?',
      question_type: 'free_text',
      retired: false,
      answered: false,
      required: true,
      text: null,
      options: [],
      file: null,
    },
    {
      question_id: 'q2',
      question_text: 'Anything you want me to read beforehand?',
      question_type: 'file_upload',
      retired: false,
      answered: false,
      required: false,
      text: null,
      options: [],
      file: null,
    },
  ],
  'u-7': [

    {
      question_id: 'q1',
      question_text: 'What would you like to talk about?',
      question_type: 'free_text',
      retired: false,
      answered: false,
      required: true,
      text: null,
      options: [],
      file: null,
    },
    {
      question_id: 'q2',
      question_text: 'Anything you want me to read beforehand?',
      question_type: 'file_upload',
      retired: false,
      answered: false,
      required: false,
      text: null,
      options: [],
      file: null,
    },
  ],
  'u-1': [
    {
      question_id: 'q1',
      question_text: 'What do you want to cover?',
      question_type: 'free_text',
      retired: false,
      answered: true,
      required: false,
      text: 'My statement of purpose for the Chevening application. I have a second draft and I am not sure the opening paragraph says anything.',
      options: [],
      file: null,
    },
    {
      question_id: 'q2',
      question_text: 'Where are you in your application?',
      question_type: 'multi_choice',
      retired: false,
      answered: true,
      required: false,
      text: null,
      options: [
        { id: 'o1', text: 'Shortlisting programs' },
        { id: 'o2', text: 'First draft written' },
      ],
      file: null,
    },
    {
      question_id: 'q3',
      question_text: 'Upload your draft or CV',
      question_type: 'file_upload',
      retired: false,
      answered: true,
      required: false,
      text: null,
      options: [],
      file: {
        id: 'f-sop',
        filename: 'SOP-draft-v2.pdf',
        content_type: 'application/pdf',
        size: 182_400,
        available: true,
      },
    },
    {
      question_id: 'q4',
      question_text: 'Which funding are you applying for?',
      question_type: 'free_text',
      retired: true,
      answered: true,
      required: false,
      text: 'Chevening, and the departmental scholarship if it reopens.',
      options: [],
      file: null,
    },
  ],
  // Backend #412. The first two questions are blank **on purpose**: taking
  // the first two in form order previewed this booking as "No answer" twice
  // over, reading as "they told us nothing" while the real content sat behind
  // the toggle.
  'u-2': [
    {
      question_id: 'q0a',
      question_text: 'What is your target intake?',
      question_type: 'free_text',
      retired: false,
      answered: false,
      required: false,
      text: null,
      options: [],
      file: null,
    },
    {
      question_id: 'q0b',
      question_text: 'Upload your transcript',
      question_type: 'file_upload',
      retired: false,
      answered: false,
      required: false,
      text: null,
      options: [],
      file: null,
    },
    {
      question_id: 'q1',
      question_text: 'What do you want to cover?',
      question_type: 'free_text',
      retired: false,
      answered: true,
      required: false,
      text: 'I have nine programs and need to cut it to five. Funding matters most.',
      options: [],
      file: null,
    },
    {
      question_id: 'q2',
      question_text: 'Attach anything you want me to read',
      question_type: 'file_upload',
      retired: false,
      answered: true,
      required: false,
      text: null,
      // Retention has taken it: the panel says so instead of offering a button.
      file: {
        id: 'f-gone',
        filename: 'shortlist.docx',
        content_type:
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        size: 24_100,
        available: false,
      },
      options: [],
    },
  ],
  'u-3': [
    {
      question_id: 'q1',
      question_text: 'Attach your CV',
      question_type: 'file_upload',
      retired: false,
      answered: true,
      required: false,
      text: null,
      options: [],
      file: {
        id: 'f-cv',
        filename: 'CV-2026.docx',
        content_type:
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        size: 41_800,
        available: true,
      },
    },
  ],
};

export async function GET(_req: Request, ctx: { params: Promise<{ sessionId: string }> }) {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  const { sessionId } = await ctx.params;
  await new Promise((r) => setTimeout(r, 180));
  // Anything else booked without a form: an empty list, not an error.
  return NextResponse.json({ data: FORMS[sessionId] ?? [], next_cursor: null });
}
