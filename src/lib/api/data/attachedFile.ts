'use client';

import { useCallback, useRef, useState } from 'react';
import type { AppError } from '@/types/mentor';
import type { MessageFile } from '@/types/messages';
import { normaliseError } from './errors';
import { useUploadMessageFile } from './messageFiles';

/**
 * The one file a message carries before it's sent (the Messages composer and
 * SendMessage): it uploads when picked, and picking another replaces it.
 * `error` is already worded. A pick still on its way when another starts (or
 * after a removal) is dropped when it lands, so the newest pick always wins.
 */
export function useAttachedFile() {
  const upload = useUploadMessageFile();
  const [file, setFile] = useState<MessageFile | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const turn = useRef(0);

  const pick = useCallback(
    async (picked: File) => {
      const mine = ++turn.current;
      setFile(null);
      setError(null);
      setUploading(picked.name);
      try {
        const up = await upload(picked);
        if (mine === turn.current) setFile(up);
      } catch (e) {
        // The upload throws our own worded AppError; anything else gets the safe generic line.
        const worded = !!e && typeof e === 'object' && 'kind' in e && 'message' in e;
        if (mine === turn.current)
          setError(worded ? (e as AppError).message : normaliseError(e).message);
      } finally {
        if (mine === turn.current) setUploading(null);
      }
    },
    [upload],
  );

  /** Remove the file (and any error), or drop a pick still on its way. */
  const clear = useCallback(() => {
    turn.current += 1;
    setFile(null);
    setUploading(null);
    setError(null);
  }, []);

  /** Say why the file went (it expired before the send). */
  const fail = useCallback((message: string) => {
    turn.current += 1;
    setFile(null);
    setUploading(null);
    setError(message);
  }, []);

  return { file, uploading, error, pick, clear, fail };
}
