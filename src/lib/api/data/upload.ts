/**
 * One multipart file body for every upload endpoint (`POST /me/intake-files`,
 * `POST /me/message-files`): a single field, `file`. The generated types call
 * the binary part a string (openapi-typescript and multipart); the serializer
 * sends the File itself.
 */
export function fileBody(file: File) {
  return {
    body: { file } as unknown as { file: string },
    bodySerializer: (b: unknown) => {
      const form = new FormData();
      form.append('file', (b as { file: File }).file);
      return form;
    },
  };
}
