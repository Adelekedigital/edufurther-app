/**
 * Mock only: the page's `?mockStage=` lets a developer drive the mentor Home's
 * new-mentor stages locally (PRD Mentor Home). `noBookings` and `firstBooked`
 * give the mock mentor 0 completed sessions; `noBookings` also drops their
 * confirmed upcoming sessions. Read from the referer, as `?mockViewer=` is.
 */
export type MockStage = 'noBookings' | 'firstBooked' | null;

export function mockStageFrom(req: Request): MockStage {
  try {
    const referer = req.headers.get('referer');
    const v = referer ? new URL(referer).searchParams.get('mockStage') : null;
    return v === 'noBookings' || v === 'firstBooked' ? v : null;
  } catch {
    return null;
  }
}
