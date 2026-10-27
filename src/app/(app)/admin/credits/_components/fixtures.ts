import type { AdminMentee, CreditEntry } from '@/lib/api/data/adminCredits';

/** Shared by the Credits component tests and stories: the design's sample people. */
export const AMARA: AdminMentee = {
  id: 'a3f2c1d4-2041-4418-9c1e-5b7d4e2f2041',
  shortId: 'a3f2c1d4',
  name: 'Amara Okafor',
  firstName: 'Amara',
  email: 'amara.okafor@example.com',
  initials: 'AO',
  cover: 'lilac',
  avatarUrl: null,
  balance: { left: 1, total: 3, stage: 'monthly', resetsOn: 'Nov 1' },
};

export const CHIAMAKA: AdminMentee = {
  ...AMARA,
  id: 'b7e4d2a1-2053-4533-8a2f-1c9d0e3b2053',
  shortId: 'b7e4d2a1',
  name: 'Chiamaka Eze',
  firstName: 'Chiamaka',
  email: 'chiamaka.eze@example.com',
  initials: 'CE',
  balance: { left: 0, total: 1, stage: 'starter', resetsOn: 'Nov 1' },
};

export const LONG_NAME: AdminMentee = {
  ...AMARA,
  id: 'c1d9e8f7-2011-4112-9b3c-4d5e6f7a2011',
  shortId: 'c1d9e8f7',
  name: 'Oluwaseun Adebayo-Williamson Okonkwo-Fashola',
  firstName: 'Oluwaseun',
  email: 'oluwaseun.adebayo-williamson.okonkwo@example.com',
};

export const ENTRIES: CreditEntry[] = [
  {
    id: 'e1',
    at: '2026-10-24T10:00:00Z',
    change: -1,
    balanceAfter: 1,
    kind: 'booking',
    menteeId: AMARA.id,
    menteeName: 'Amara Okafor',
    menteeGone: false,
    what: 'Booked a session with Ibrahim Adele',
    by: 'Amara',
  },
  {
    id: 'e2',
    at: '2026-10-15T10:00:00Z',
    change: 1,
    balanceAfter: 2,
    kind: 'refund',
    menteeId: AMARA.id,
    menteeName: 'Amara Okafor',
    menteeGone: false,
    what: 'Refunded: Natasha Rebel canceled',
    by: 'System',
  },
  {
    id: 'e3',
    at: '2026-10-08T10:00:00Z',
    change: 2,
    balanceAfter: 3,
    kind: 'admin_grant',
    menteeId: 'gone',
    menteeName: 'Deleted account',
    menteeGone: true,
    what: 'Added by admin · Mentor no-show',
    by: 'Kemi Ade',
  },
];

export const NO_MORE = {
  hasMore: false,
  loadingMore: false,
  loadMoreFailed: false,
  loadMore: () => {},
};
