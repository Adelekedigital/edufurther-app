import { ADMIN_MENTORS, bulkApproveMock, listingMock } from './adminMentors';

describe('admin mentors mock store', () => {
  it('bulk approve counts a repeated id once', () => {
    const out = bulkApproveMock(['m-ao', 'm-ao', 'nobody']);
    expect(out).toEqual({ approved: ['m-ao'], failed: ['nobody'] });
  });

  it('an admin may unlist a self-paused mentor; only they can resume themselves', () => {
    expect(listingMock('m-co', true, null)).toBe('self');
    expect(listingMock('m-co', false, 'Talk first')).toBe('ok');
    expect(ADMIN_MENTORS.find((m) => m.user_id === 'm-co')).toMatchObject({
      paused_by: 'admin',
      paused_reason: 'Talk first',
    });
    expect(listingMock('m-co', true, null)).toBe('ok');
  });
});
