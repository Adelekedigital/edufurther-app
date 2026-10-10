import { describe, expect, it } from 'vitest';
import type { components } from '@/lib/api/generated/schema';
import { toAnswer } from './sessionAnswers';
import { canPreview } from './intakeFiles';
import { fileSize } from '@/lib/utils/format';

type Read = components['schemas']['SessionAnswerRead'];

const read = (over: Partial<Read>): Read => ({
  question_id: 'q1',
  question_text: 'What do you want to cover?',
  question_type: 'free_text',
  retired: false,
  // Defaulted in the spec (backend #412), so always sent on a response.
  answered: true,
  text: null,
  options: [],
  file: null,
  ...over,
});

describe('toAnswer — an answer becomes one string, in one place', () => {
  it('free text comes through as written, trimmed', () => {
    expect(toAnswer(read({ text: '  Nine programs.  ' })).text).toBe('Nine programs.');
  });

  it('choices are joined, so the panel never renders a bare array', () => {
    const a = toAnswer(
      read({
        question_type: 'multi_choice',
        options: [
          { id: 'o1', text: 'Shortlisting programs' },
          { id: 'o2', text: 'First draft written' },
        ],
      }),
    );
    expect(a.text).toBe('Shortlisting programs, First draft written');
  });

  it('a file answer is named by its filename and keeps what the viewer needs', () => {
    const a = toAnswer(
      read({
        question_type: 'file_upload',
        file: {
          id: 'f1',
          filename: 'SOP-draft.pdf',
          content_type: 'application/pdf',
          size: 182_400,
          available: true,
        },
      }),
    );
    expect(a.text).toBe('SOP-draft.pdf');
    expect(a.file).toEqual({
      id: 'f1',
      filename: 'SOP-draft.pdf',
      contentType: 'application/pdf',
      size: 182_400,
      available: true,
    });
  });

  it('a question the mentor has since dropped is marked, and keeps its answer', () => {
    const a = toAnswer(read({ retired: true, text: 'Chevening.' }));
    expect(a.retired).toBe(true);
    expect(a.text).toBe('Chevening.');
  });

  it('a type switched after the answer was given does not crash the mapping', () => {
    // The backend warns a mentor may change a question's type; the answer then
    // carries a shape the question no longer asks for.
    expect(toAnswer(read({ question_type: 'multi_choice', options: [] })).text).toBe('');
    expect(toAnswer(read({ question_type: 'file_upload', file: null })).text).toBe('');
  });
});

describe('a file is previewable only when the browser can show it', () => {
  it('a PDF that is still there', () => {
    expect(
      canPreview({
        id: 'f',
        filename: 'a.pdf',
        contentType: 'application/pdf',
        size: 1,
        available: true,
      }),
    ).toBe(true);
  });

  it('Word never previews — no browser renders one', () => {
    expect(
      canPreview({
        id: 'f',
        filename: 'a.docx',
        contentType:
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        size: 1,
        available: true,
      }),
    ).toBe(false);
  });

  it('a PDF retention has removed does not preview, so nothing fetches it', () => {
    expect(
      canPreview({
        id: 'f',
        filename: 'a.pdf',
        contentType: 'application/pdf',
        size: 1,
        available: false,
      }),
    ).toBe(false);
  });
});

describe('fileSize', () => {
  it('reads as a size a person would say', () => {
    expect(fileSize(400)).toBe('400 B');
    expect(fileSize(182_400)).toBe('178 KB');
    expect(fileSize(5_242_880)).toBe('5.0 MB');
  });
});
