import { describe, expect, it } from 'vitest';
import { canPreview, cleanFileName, downloadName, pickedFileProblem } from './files';

const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

describe('a file is previewable only when the browser can show it', () => {
  it('a PDF that is still there', () => {
    expect(canPreview({ contentType: 'application/pdf', available: true })).toBe(true);
  });

  it('Word never previews: no browser renders one', () => {
    expect(canPreview({ contentType: DOCX, available: true })).toBe(false);
  });

  it('a PDF retention has removed does not preview, so nothing fetches it', () => {
    expect(canPreview({ contentType: 'application/pdf', available: false })).toBe(false);
  });

  it('anything else is a download, however it is labelled', () => {
    expect(canPreview({ contentType: 'text/html', available: true })).toBe(false);
  });
});

describe('pickedFileProblem: the obvious refusals, before anything is sent', () => {
  const file = (name: string, size: number, type: string) =>
    Object.defineProperty(new File(['x'], name, { type }), 'size', { value: size });
  const PDF = 'application/pdf';
  const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

  it('a PDF or a .docx up to 5 MB is fine', () => {
    expect(pickedFileProblem(file('a.pdf', 5 * 1024 * 1024, PDF))).toBeNull();
    expect(pickedFileProblem(file('cv.DOCX', 1000, DOCX))).toBeNull();
    expect(pickedFileProblem(file('cv.docx', 1000, ''))).toBeNull();
    // Some Windows and Android pickers report a .docx as octet-stream: the name decides.
    expect(pickedFileProblem(file('cv.docx', 1000, 'application/octet-stream'))).toBeNull();
  });
  it('over 5 MB is too big', () => {
    expect(pickedFileProblem(file('a.pdf', 5 * 1024 * 1024 + 1, PDF))).toBe('tooBig');
  });
  it('anything else is the wrong type, whatever its size', () => {
    expect(pickedFileProblem(file('a.doc', 10, 'application/msword'))).toBe('wrongType');
    expect(pickedFileProblem(file('a.docm', 10, ''))).toBe('wrongType');
    expect(pickedFileProblem(file('a.exe', 10, 'application/octet-stream'))).toBe('wrongType');
    expect(pickedFileProblem(file('a.png', 9e9, 'image/png'))).toBe('wrongType');
    expect(pickedFileProblem(file('fake.pdf', 10, 'text/html'))).toBe('wrongType');
  });
});

describe('file names from another person', () => {
  it('cleanFileName drops bidi and control characters', () => {
    const c = String.fromCharCode;
    expect(cleanFileName(`CV${c(0x202e)}xcod.exe`)).toBe('CVxcod.exe');
    expect(cleanFileName(`a${c(0x2066)}b${c(0x200f)}c${c(0)}.pdf`)).toBe('abc.pdf');
    expect(cleanFileName('Amara Okafor CV.pdf')).toBe('Amara Okafor CV.pdf');
  });
  it('downloadName takes its extension from the checked type', () => {
    expect(downloadName('CV.pdf', 'application/pdf')).toBe('CV.pdf');
    expect(downloadName('notes.pdf.exe', 'application/pdf')).toBe('notes.pdf.pdf');
    expect(downloadName('Plan.docx', DOCX)).toBe('Plan.docx');
    expect(downloadName('page.html', 'text/html')).toBe('page');
    expect(downloadName('.pdf', 'application/pdf')).toBe('file.pdf');
  });
});
