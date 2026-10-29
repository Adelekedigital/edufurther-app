'use client';

import { useMutation } from '@tanstack/react-query';
import { COMPOSER_COPY } from '@/lib/copy/messages';
import { pickedFileProblem } from '@/lib/utils/files';
import type { MessageFile } from '@/types/messages';
import type { AppError } from '@/types/mentor';
import { fileBody, uploadError } from './upload';
import { ApiError, apiError, normaliseError } from './errors';
import { toMessageFile } from './messages';
import { api } from './http';

/**
 * The refusals Messages words itself (PRD: "Errors map to the two designed
 * messages", plus the 409 cap on unsent uploads); everything else is the intake upload's wording (rate limit,
 * signed out, server down), so both uploads say those the same way.
 */
export function messageFileError(e: unknown): AppError {
  const s = e instanceof ApiError ? e.status : undefined;
  const type = e instanceof ApiError ? e.type : undefined;
  if (s === 413 || type?.endsWith('/problems/file-too-large'))
    return { ...normaliseError(e), message: COMPOSER_COPY.tooBig };
  if (type?.endsWith('/problems/file-type-not-allowed'))
    return { ...normaliseError(e), message: COMPOSER_COPY.wrongType };
  // The cap on unsent uploads; the intake wording (a booking) would be wrong here.
  if (s === 409) return { ...normaliseError(e), message: COMPOSER_COPY.tooManyUnsent };
  return uploadError(e);
}

/**
 * POST /me/message-files (multipart `file`): uploads when the file is picked,
 * before the message is sent; the send then carries its `file_id`. An upload
 * never sent is swept after 24 hours. The obvious refusals (size, type) are
 * said here before anything is sent; the server still decides from the bytes.
 */
export function useUploadMessageFile() {
  const mutation = useMutation<MessageFile, AppError, File>({
    mutationFn: async (file) => {
      const problem = pickedFileProblem(file);
      if (problem === 'tooBig') throw messageFileError(new ApiError(413));
      if (problem === 'wrongType')
        throw messageFileError(new ApiError(422, undefined, '/problems/file-type-not-allowed'));
      let result;
      try {
        result = await api.POST('/api/v1/me/message-files', fileBody(file));
      } catch (e) {
        throw messageFileError(e);
      }
      const { data, error, response } = result;
      if (!response.ok || !data) throw messageFileError(apiError(response.status, error, response));
      return toMessageFile({
        id: data.file_id,
        filename: data.filename,
        size: data.size,
        content_type: data.content_type,
      });
    },
  });
  // Stable across renders (TanStack keeps mutateAsync), so callers can depend on it.
  return mutation.mutateAsync;
}
