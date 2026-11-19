import { act, renderHook } from '@testing-library/react';
import { sampleBookingFor, sampleParty } from '@/lib/utils/bookingTestFixtures';
import type { Booking } from '@/types/booking';
import type { SessionType } from '@/types/mentor';
import { moveHook, resetCancelMove, sessionTypes } from './cancelMove.harness';
import { useCancelMove, type MoveLanding } from './useCancelMove';
import type { MoveOption } from './ConfirmActionDialog';

// Cancel with the option to move, as Session Join and Bookings share it: which
// bookings get the move, the session type taken once, and where a move lands.
// The screens' own tests cover what each does with it; the dialog's, the view.

vi.mock('@/lib/api/data/moveSession', async () =>
  (await import('./cancelMove.harness')).cancelMoveMocks.moveSession(),
);
vi.mock('@/lib/api/data/booking', async () => ({
  useSessionTypes: (await import('./cancelMove.harness')).cancelMoveMocks.useSessionTypes,
}));

const NOW = new Date('2026-10-03T12:00:00Z');
const TYPE: SessionType = {
  id: 'st1',
  name: '1:1 call',
  durationMin: 30,
  description: '',
  windowDays: 30,
  requiresConfirmation: false,
  questions: [],
};

/** A mentee's confirmed session 29 hours out, refundable until 12 hours before. */
const session = (over: Partial<Booking> = {}): Booking =>
  sampleBookingFor({
    id: 'b1',
    side: 'mentee',
    status: 'confirmed',
    sessionTypeId: 'st1',
    other: sampleParty({ id: 'amara', name: 'Amara Okafor', firstName: 'Amara' }),
    startsAt: '2026-10-04T17:00:00Z',
    endsAt: '2026-10-04T17:30:00Z',
    refundUntil: '2026-10-04T05:00:00Z',
    ...over,
  });

function setup(
  live: Booking | null = session(),
  landing: MoveLanding = 'leaving',
  now: Date = NOW,
) {
  const onMoved = vi.fn((): MoveLanding => landing);
  const view = renderHook((p: { live: Booking | null }) => useCancelMove({ ...p, now, onMoved }), {
    initialProps: { live },
  });
  return { ...view, onMoved };
}

const option = (m: MoveOption | 'loading' | undefined) => {
  if (!m || m === 'loading') throw new Error(`no move option: ${m}`);
  return m;
};

beforeEach(() => {
  resetCancelMove();
  sessionTypes.data = [TYPE];
});

describe('who is offered the move', () => {
  it('a mentee’s refundable confirmed session: the type as the mentor offers it', () => {
    const { result } = setup();
    act(() => result.current.open(session()));
    expect(result.current.isOpen).toBe(true);
    expect(option(result.current.move).sessionType).toEqual(TYPE);
  });

  it('reads the types ahead for the booking on screen, before Cancel is pressed', () => {
    setup();
    expect(sessionTypes.asked).toContain('amara');
  });

  it('a mentor’s session: no move, and no types read for it', () => {
    const b = session({ side: 'mentor' });
    const { result } = setup(b);
    act(() => result.current.open(b));
    expect(result.current.move).toBeUndefined();
    expect(sessionTypes.asked.every((id) => id === null)).toBe(true);
  });

  it('past the refund deadline: no move (it would cost a second credit)', () => {
    const late = new Date('2026-10-04T08:00:00Z');
    const { result } = setup(session(), 'leaving', late);
    act(() => result.current.open(session()));
    expect(result.current.move).toBeUndefined();
  });

  it('a row with no refund deadline: no move, never guessed from the device clock', () => {
    const b = session({ refundUntil: null });
    const { result } = setup(b);
    act(() => result.current.open(b));
    expect(result.current.move).toBeUndefined();
  });

  it('a type the mentor no longer offers: no move', () => {
    sessionTypes.data = [];
    const { result } = setup();
    act(() => result.current.open(session()));
    expect(result.current.move).toBeUndefined();
  });

  it('nothing until Cancel is pressed, and nothing once closed', () => {
    const { result } = setup();
    expect(result.current.move).toBeUndefined();
    act(() => result.current.open(session()));
    act(() => result.current.close());
    expect(result.current.isOpen).toBe(false);
    expect(result.current.move).toBeUndefined();
    expect(moveHook.reset).toHaveBeenCalled();
  });
});

describe('the session type, taken once', () => {
  it('pressed before the types answer: loading, then the move', () => {
    sessionTypes.loading = true;
    const { result, rerender } = setup();
    act(() => result.current.open(session()));
    expect(result.current.move).toBe('loading');
    sessionTypes.loading = false;
    rerender({ live: session() });
    expect(option(result.current.move).sessionType).toEqual(TYPE);
  });

  it('a refetch while open never changes the view under the reader', () => {
    const { result, rerender } = setup();
    act(() => result.current.open(session()));
    sessionTypes.data = [{ ...TYPE, requiresConfirmation: true }];
    rerender({ live: session() });
    expect(option(result.current.move).sessionType.requiresConfirmation).toBe(false);
  });
});

describe('where the move lands', () => {
  it('sends the latest copy of the row, with the picked time and message', () => {
    const { result, rerender } = setup();
    act(() => result.current.open(session()));
    rerender({ live: session({ note: 'refetched' }) });
    act(() => option(result.current.move).onMove({ startsAt: 'T', message: 'Hi' }));
    const { req } = moveHook.calls.at(-1)!;
    expect(req.booking.note).toBe('refetched');
    expect(req).toMatchObject({ startsAt: 'T', message: 'Hi' });
  });

  it('leaving: holds on Working…, showing the session as it was when Move was pressed', () => {
    const { result, rerender, onMoved } = setup();
    act(() => result.current.open(session()));
    act(() => option(result.current.move).onMove({ startsAt: 'T', message: '' }));
    rerender({ live: session({ status: 'cancelled' }) });
    act(() => moveHook.calls.at(-1)!.onMoved('b-new', true));
    expect(onMoved).toHaveBeenCalledWith('b-new', true);
    expect(result.current.holding).toBe(true);
    expect(result.current.movingFrom?.status).toBe('confirmed');
    expect(option(result.current.move).pending).toBe(true);
  });

  it('after leaving, the next Cancel opens clean, never on "Working…"', () => {
    const { result } = setup();
    act(() => result.current.open(session()));
    act(() => option(result.current.move).onMove({ startsAt: 'T', message: '' }));
    act(() => moveHook.calls.at(-1)!.onMoved('b-new', true));
    act(() => result.current.close());
    expect(result.current.holding).toBe(false);
    act(() => result.current.open(session()));
    expect(result.current.holding).toBe(false);
    expect(result.current.movingFrom).toBeNull();
    expect(option(result.current.move).pending).toBe(false);
  });

  it('open again without closing (a page restored after leaving): clean too', () => {
    const { result } = setup();
    act(() => result.current.open(session()));
    act(() => option(result.current.move).onMove({ startsAt: 'T', message: '' }));
    act(() => moveHook.calls.at(-1)!.onMoved('b-new', true));
    act(() => result.current.open(session()));
    expect(result.current.holding).toBe(false);
    expect(option(result.current.move).pending).toBe(false);
  });

  it('done: the dialog closes where it is, and nothing is held', () => {
    const { result, onMoved } = setup(session(), 'done');
    act(() => result.current.open(session()));
    act(() => option(result.current.move).onMove({ startsAt: 'T', message: '' }));
    act(() => moveHook.calls.at(-1)!.onMoved('b-new', false));
    expect(onMoved).toHaveBeenCalledWith('b-new', false);
    expect(result.current.isOpen).toBe(false);
    expect(result.current.holding).toBe(false);
    expect(result.current.movingFrom).toBeNull();
  });

  it('refused: the move’s own words, and nothing held', () => {
    moveHook.error = { kind: 'conflict', message: 'That time was just taken.' };
    const { result } = setup();
    act(() => result.current.open(session()));
    expect(option(result.current.move).error).toBe('That time was just taken.');
    expect(result.current.holding).toBe(false);
  });
});
