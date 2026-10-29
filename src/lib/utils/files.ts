import type { ViewedFile } from '@/types/files';
import type { MessageFile } from '@/types/messages';

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
  // Some systems report no type, or the generic octet-stream, for a .docx;
  // the name decides then.
  const typed =
    !file.type || file.type === 'application/octet-stream' || UPLOAD_TYPES.includes(file.type);
  if (!named || !typed) return 'wrongType';
  if (file.size > UPLOAD_MAX_BYTES) return 'tooBig';
  return null;
}

/**
 * The glyph for a file chip or card. The designs draw only `picture_as_pdf`;
 * a Word file gets the plain document one, so a .docx never reads as a PDF.
 */
export function fileGlyph(contentType: string): 'picture_as_pdf' | 'description' {
  return contentType === 'application/pdf' ? 'picture_as_pdf' : 'description';
}

/** A send refused because its upload is gone (swept after 24 hours unsent). */
export function isFileExpired(problem: string | undefined): boolean {
  return !!problem?.endsWith('/problems/file-unavailable');
}

/**
 * Bidi controls (U+200E/F, U+202A to U+202E, U+2066 to U+2069, U+061C) and other
 * C0/C1 controls. A name is another person's text: "CV" + U+202E + "xcod.exe"
 * would read as "CVexe.docx".
 */
/** Code point ranges, written as numbers so no invisible character sits in the source. */
const CONTROL_RANGES: [number, number][] = [
  [0x0000, 0x001f],
  [0x007f, 0x009f],
  [0x061c, 0x061c],
  [0x200e, 0x200f],
  [0x202a, 0x202e],
  [0x2066, 0x2069],
];
const u = (n: number) => '\\u' + n.toString(16).padStart(4, '0');
const NAME_CONTROLS = new RegExp(
  `[${CONTROL_RANGES.map(([a, b]) => `${u(a)}-${u(b)}`).join('')}]`,
  'g',
);

/** A file name safe to show: no controls that reorder or hide what it says. */
export function cleanFileName(name: string): string {
  return name.replace(NAME_CONTROLS, '');
}

const EXTENSION_FOR: Record<string, string> = {
  'application/pdf': '.pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
};

/**
 * The name a download saves under: the shown name with its extension set from
 * the type the server decided from the bytes, so "notes.pdf.exe" saves as
 * "notes.pdf.pdf", never as something the system would run.
 */
export function downloadName(name: string, contentType: string): string {
  const ext = EXTENSION_FOR[contentType] ?? '';
  const base = cleanFileName(name).replace(/\.[^./\\]{1,8}$/, '');
  return `${base || 'file'}${ext}`;
}

/** A message file as FileViewer opens it (always available: message files are kept, Q11). */
export function messageViewerFile(f: MessageFile): ViewedFile {
  return {
    kind: 'message',
    id: f.id,
    name: f.name,
    contentType: f.contentType,
    size: f.sizeBytes,
    available: true,
  };
}
