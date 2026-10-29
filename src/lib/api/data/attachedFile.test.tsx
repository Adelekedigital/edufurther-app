import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MessageFile } from '@/types/messages';
import { useAttachedFile } from './attachedFile';

const upload = vi.fn();
vi.mock('./messageFiles', () => ({ useUploadMessageFile: () => upload }));

const pdf = (name: string) => new File(['%PDF'], name, { type: 'application/pdf' });
const up = (id: string, name: string): MessageFile => ({
  id,
  name,
  sizeBytes: 4,
  contentType: 'application/pdf',
});
/** An upload the test answers when it chooses. */
function later() {
  let answer!: (f: MessageFile) => void;
  let refuse!: (e: unknown) => void;
  const p = new Promise<MessageFile>((res, rej) => {
    answer = res;
    refuse = rej;
  });
  return { p, answer, refuse };
}

beforeEach(() => upload.mockReset());

describe('useAttachedFile', () => {
  it('the newest pick wins when an older upload lands after it', async () => {
    const a = later();
    const b = later();
    upload.mockReturnValueOnce(a.p).mockReturnValueOnce(b.p);
    const { result } = renderHook(() => useAttachedFile());
    act(() => void result.current.pick(pdf('A.pdf')));
    act(() => void result.current.pick(pdf('B.pdf')));
    expect(result.current.uploading).toBe('B.pdf');
    await act(async () => b.answer(up('b', 'B.pdf')));
    await act(async () => a.answer(up('a', 'A.pdf')));
    expect(result.current.file?.id).toBe('b');
    expect(result.current.uploading).toBeNull();
  });

  it('clear during an upload drops it when it lands', async () => {
    const a = later();
    upload.mockReturnValueOnce(a.p);
    const { result } = renderHook(() => useAttachedFile());
    act(() => void result.current.pick(pdf('A.pdf')));
    act(() => result.current.clear());
    await act(async () => a.answer(up('a', 'A.pdf')));
    expect(result.current.file).toBeNull();
    expect(result.current.uploading).toBeNull();
  });

  it('fail during an upload keeps its line, not the late file or error', async () => {
    const a = later();
    upload.mockReturnValueOnce(a.p);
    const { result } = renderHook(() => useAttachedFile());
    act(() => void result.current.pick(pdf('A.pdf')));
    act(() => result.current.fail('Your file expired. Attach it again.'));
    await act(async () => a.refuse({ kind: 'server', message: 'late' }));
    expect(result.current.error).toBe('Your file expired. Attach it again.');
    expect(result.current.file).toBeNull();
  });

  it('a refused upload is worded; anything unworded gets the safe line', async () => {
    upload.mockRejectedValueOnce({
      kind: 'validation',
      message: 'Use a PDF or Word (.docx) file.',
    });
    const { result } = renderHook(() => useAttachedFile());
    await act(() => result.current.pick(pdf('A.pdf')));
    expect(result.current.error).toBe('Use a PDF or Word (.docx) file.');
    upload.mockRejectedValueOnce(new Error('boom'));
    await act(() => result.current.pick(pdf('A.pdf')));
    expect(result.current.error).toBeTruthy();
    expect(result.current.error).not.toContain('boom');
  });

  it('an obvious refusal keeps the file already attached', async () => {
    upload.mockResolvedValueOnce(up('a', 'A.pdf'));
    const { result } = renderHook(() => useAttachedFile());
    await act(() => result.current.pick(pdf('A.pdf')));
    await act(() => result.current.pick(new File(['x'], 'photo.png', { type: 'image/png' })));
    expect(result.current.file?.id).toBe('a');
    expect(result.current.error).toBe('Use a PDF or Word (.docx) file.');
    expect(upload).toHaveBeenCalledTimes(1);
  });
});
