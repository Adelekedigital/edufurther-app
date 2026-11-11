import { isPreviewing } from '@/lib/api/data/previewStore';
import { startClientErrors } from '@/lib/vendor/errors';

// Error tracking in the browser (lib/vendor/errors): nothing loads unless
// NEXT_PUBLIC_SENTRY_ENABLED and a DSN are set, and then only when idle. The
// preview check is passed in here, before React mounts anything, so a crash
// on the first render of a preview is never sent (PRD 27).
startClientErrors(isPreviewing);
