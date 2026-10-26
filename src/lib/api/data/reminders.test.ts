import { describe, expect, it } from 'vitest';
import { ApiError } from './errors';
import { reminderFailure } from './reminders';

describe('reminderFailure: which words a refused reminder gets', () => {
  it('a second reminder is "already sent", by its problem type', () => {
    expect(reminderFailure(new ApiError(409, 'x', '/problems/reminder-already-sent'))).toBe(
      'alreadySent',
    );
  });

  it('any other 409 is a request that has closed (answered, withdrawn, expired, lapsed)', () => {
    expect(reminderFailure(new ApiError(409, 'x', '/problems/request-not-pending'))).toBe('closed');
  });

  it('403 and 404 can’t succeed on a retry either, so they read as closed', () => {
    expect(reminderFailure(new ApiError(403, 'x', '/problems/reminder-mentee-only'))).toBe(
      'closed',
    );
    expect(reminderFailure(new ApiError(404))).toBe('closed');
  });

  it('no connection is offline; anything else is a plain failure to try again', () => {
    expect(reminderFailure(new TypeError('Failed to fetch'))).toBe('offline');
    expect(reminderFailure(new ApiError(500))).toBe('failed');
  });
});
