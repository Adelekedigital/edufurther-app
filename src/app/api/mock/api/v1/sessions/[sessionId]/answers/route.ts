import { NextResponse } from 'next/server';

/**
 * MOCK of GET /api/v1/sessions/{id}/answers: one entry per ANSWERED question,
 * in form order. Keyed off the mock session ids so each shape is reachable —
 * free text, a choice list, a file, a retired question, and the empty case.
 * ENABLE_MOCK_API=1 only.
 */
const FORMS: Record<string, unknown[]> = {
  'u-1': [
    {
      question_id: 'q1',
      question_text: 'What do you want to cover?',
      question_type: 'free_text',
      retired: false,
      text: 'My statement of purpose for the Chevening application. I have a second draft and I am not sure the opening paragraph says anything.',
      options: [],
      file: null,
    },
    {
      question_id: 'q2',
      question_text: 'Where are you in your application?',
      question_type: 'multi_choice',
      retired: false,
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
      text: 'Chevening, and the departmental scholarship if it reopens.',
      options: [],
      file: null,
    },
  ],
  'u-2': [
    {
      question_id: 'q1',
      question_text: 'What do you want to cover?',
      question_type: 'free_text',
      retired: false,
      text: 'I have nine programs and need to cut it to five. Funding matters most.',
      options: [],
      file: null,
    },
    {
      question_id: 'q2',
      question_text: 'Attach anything you want me to read',
      question_type: 'file_upload',
      retired: false,
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
