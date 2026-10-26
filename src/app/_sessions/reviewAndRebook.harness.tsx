/**
 * Test stubs for `useReviewAndRebook`'s modules, shared by the Session Join and
 * Bookings harnesses: the review send hook (with real state, so "sent"
 * re-renders as the real one does), and the review and booking modals reduced
 * to their wiring (each is tested on its own; their hooks need a query client).
 * Register with `vi.mock(path, () => reviewAndRebookMocks.x())`.
 */
import type { Mentor } from '@/types/mentor';

/** Every review sent, in order. */
export const sent: unknown[] = [];
/** Every mentor the booking modal was given, render by render (null: closed). */
export const launched: (Mentor | null)[] = [];

export const reviewAndRebookMocks = {
  // The send hook keeps real state, so "sent" re-renders as the real one does.
  reviewWrite: async () => {
    const { useState } = await import('react');
    return {
      useSendReview: () => {
        const [result, setResult] = useState<{ editableUntil: string | null } | null>(null);
        return {
          send: (input: unknown) => {
            sent.push(input);
            setResult({ editableUntil: null });
          },
          isPending: false,
          result,
          error: null,
          reset: () => setResult(null),
        };
      },
    };
  },
  // The review modal is ReviewFlow's (tested on its own); here, only its wiring.
  reviewDialog: () => ({
    ReviewDialog: (p: {
      mentorFirstName: string;
      sessions: { id: string }[];
      done: boolean;
      onSend: (a: unknown, id: string | null) => void;
      onClose: () => void;
      onBookAgain?: () => void;
    }) => (
      <div role="dialog" aria-label={`Review ${p.mentorFirstName}`}>
        <span>{p.done ? 'Sent' : `About ${p.sessions.map((x) => x.id).join(',')}`}</span>
        <button type="button" onClick={() => p.onSend({ overall: 5 }, p.sessions[0]!.id)}>
          Send review
        </button>
        <button type="button" onClick={p.onClose}>
          Close review
        </button>
        {p.onBookAgain && (
          <button type="button" onClick={p.onBookAgain}>
            Book again from the review
          </button>
        )}
      </div>
    ),
  }),
  // The modal itself is BookingLauncher's (tested on its own; its hooks need a
  // query client): here, only who it books, in whose zone.
  bookingLauncher: () => ({
    BookingLauncher: (p: {
      mentor: Mentor | null;
      ratingUnknown?: boolean;
      timeZone?: string;
      onClose: () => void;
    }) => {
      launched.push(p.mentor);
      return p.mentor ? (
        <div role="dialog" aria-label={`Book ${p.mentor.name}`}>
          <span>{`${p.mentor.profileHref} ${p.timeZone} ${String(!!p.ratingUnknown)}`}</span>
          <button type="button" onClick={p.onClose}>
            Close booking
          </button>
        </div>
      ) : null;
    },
  }),
};

export function resetReviewAndRebook() {
  sent.length = 0;
  launched.length = 0;
}
