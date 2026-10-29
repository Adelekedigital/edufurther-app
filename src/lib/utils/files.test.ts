import { describe, expect, it } from 'vitest';
import { canPreview } from './files';

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
