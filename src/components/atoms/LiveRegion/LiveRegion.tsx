/**
 * A polite, visually hidden status that is always in the DOM, so a screen
 * reader hears each new message; a region inserted with its text already in it
 * is often skipped. Pass a new `id` to repeat the same words.
 */
export function LiveRegion({ message }: { message: { text: string; id: number } | null }) {
  return (
    <p role="status" className="sr-only">
      {message && <span key={message.id}>{message.text}</span>}
    </p>
  );
}
