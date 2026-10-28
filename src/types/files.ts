/**
 * A private file the app can open in FileViewer: a mentee's intake answer or a
 * file sent in Messages. Both live in a private bucket behind the bearer token,
 * so they are fetched, never linked.
 */
export type PrivateFileKind = 'intake' | 'message';

export type ViewedFile = {
  kind: PrivateFileKind;
  id: string;
  /** The original file name: the viewer's title and the saved file's name. */
  name: string;
  /** Decided from the bytes server-side (`application/pdf` or the .docx type). */
  contentType: string;
  /** Bytes. */
  size: number;
  /** False once retention has removed it (intake only): never fetched. */
  available: boolean;
};

/** Who shared a file, for FileViewer's subtitle ("Shared by Amara" / "Shared by you"). */
export type FileSharer = { mine: true } | { mine: false; firstName: string };
