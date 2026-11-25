import type { NextConfig } from 'next';

type Redirect = Awaited<ReturnType<NonNullable<NextConfig['redirects']>>>[number];

/**
 * The old app's page addresses, now that app.edufurther.org serves this one
 * (DNS move, 22 Nov 2026). The marketing site's every "Sign up" button still
 * points at `/authpage?authtype=newuser`, which 404'd here: no new accounts
 * were made from 24 Nov until this shipped (owner, 25 Nov). Old emails and
 * bookmarks carry the others. Profile links are `src/app/profile/[id]`.
 * Next keeps the query on the way through.
 */
export const LEGACY_REDIRECTS: Redirect[] = [
  {
    source: '/authpage',
    has: [{ type: 'query', key: 'authtype', value: 'newuser' }],
    destination: '/signup',
    permanent: true,
  },
  { source: '/authpage', destination: '/login', permanent: true },
  { source: '/reset_pw', destination: '/login', permanent: true },
  { source: '/index', destination: '/', permanent: true },
  { source: '/joinsession', destination: '/bookings', permanent: true },
];
