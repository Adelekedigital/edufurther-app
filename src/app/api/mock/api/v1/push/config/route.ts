import { NextResponse } from 'next/server';
import { ok } from '@/lib/api/mock/respond';

/**
 * MOCK of GET /api/v1/push/config, as a backend with push set up answers, so
 * the mock app shows the notifications card. The key is a placeholder in the
 * right shape (an uncompressed P-256 point, base64url): no push service
 * accepts it, so nothing can be subscribed or sent from the mock.
 * ENABLE_MOCK_API=1 only.
 */
const PLACEHOLDER_KEY =
  'BPlaceholderMockKeyNotForUseAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

export async function GET() {
  if (process.env.ENABLE_MOCK_API !== '1') return new NextResponse(null, { status: 404 });
  return ok('/api/v1/push/config', 'get', { vapid_public_key: PLACEHOLDER_KEY });
}
