import { describe, expect, it } from 'vitest';
import { ApiError } from './errors';
import { messageFileError } from './messageFiles';

describe('messageFileError: the designed refusals, the rest as intake says them', () => {
  it('over 5 MB (422 file-too-large, or the edge’s 413)', () => {
    expect(messageFileError(new ApiError(422, undefined, '/problems/file-too-large')).message).toBe(
      'That file is over 5 MB. Choose a smaller one.',
    );
    expect(messageFileError(new ApiError(413)).message).toBe(
      'That file is over 5 MB. Choose a smaller one.',
    );
  });
  it('not a PDF or .docx', () => {
    expect(
      messageFileError(new ApiError(422, undefined, '/problems/file-type-not-allowed')).message,
    ).toBe('Use a PDF or Word (.docx) file.');
  });
  it('10 unsent uploads (409): the message wording, never the booking one', () => {
    expect(messageFileError(new ApiError(409)).message).toBe(
      'You’ve attached too many files you haven’t sent. You can attach more tomorrow.',
    );
  });
  it('rate limited: says when', () => {
    expect(messageFileError(new ApiError(429, undefined, undefined, 120)).message).toBe(
      'You’ve uploaded a lot of files in the last hour. Try again in 2 minutes.',
    );
  });
});
