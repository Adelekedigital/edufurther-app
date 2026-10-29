/**
 * What the browser can show itself. Everything else is a download.
 *
 * `as const` rather than a mutable array: this list is the whole of the
 * argument that only a PDF ever reaches FileViewer's `<object>`, and an
 * exported `string[]` is something a later module could push a scriptable type
 * onto.
 */
export const VIEWABLE = ['application/pdf'] as const;

export function canPreview(file: { available: boolean; contentType: string }): boolean {
  return file.available && (VIEWABLE as readonly string[]).includes(file.contentType);
}
