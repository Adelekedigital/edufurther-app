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

/** What every upload takes (intake answers, message files): PDF or Word .docx, 5 MB. */
export const UPLOAD_MAX_BYTES = 5 * 1024 * 1024;
export const UPLOAD_ACCEPT = '.pdf,.docx';
const UPLOAD_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

/**
 * The client's first look at a picked file, so an obvious refusal is said at
 * once and nothing is sent. The server still decides from the bytes (a renamed
 * zip or a .docm passes here and is refused there).
 */
export function pickedFileProblem(file: File): 'tooBig' | 'wrongType' | null {
  const named = /\.(pdf|docx)$/i.test(file.name);
  // Some systems report no type for a .docx; the name decides then.
  const typed = !file.type || UPLOAD_TYPES.includes(file.type);
  if (!named || !typed) return 'wrongType';
  if (file.size > UPLOAD_MAX_BYTES) return 'tooBig';
  return null;
}
