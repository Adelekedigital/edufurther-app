import { StrictMode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ViewedFile } from '@/types/files';
import { intakeSharer } from '@/lib/api/data/privateFiles';
import { FileViewerLauncher } from './FileViewerLauncher';

const PDF: ViewedFile = {
  kind: 'intake',
  id: 'f-sop',
  name: 'SOP-draft-v2.pdf',
  contentType: 'application/pdf',
  size: 182_400,
  available: true,
};
const DOCX: ViewedFile = {
  ...PDF,
  id: 'f-cv',
  name: 'CV-2026.docx',
  contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

const get = vi.fn();
vi.mock('@/lib/api/data/http', () => ({ api: { GET: (...a: unknown[]) => get(...a) } }));
vi.mock('@/lib/api/data/session', () => ({
  useSession: () => ({ status: 'member', userId: 'u' }),
  sessionKey: () => 'u',
}));

const created: string[] = [];
const minted: Blob[] = [];
const revoked: string[] = [];

beforeEach(() => {
  get.mockReset();
  created.length = 0;
  minted.length = 0;
  revoked.length = 0;
  let n = 0;
  URL.createObjectURL = vi.fn((b: Blob | MediaSource) => {
    minted.push(b as Blob);
    const u = `blob:mock/${++n}`;
    created.push(u);
    return u;
  });
  URL.revokeObjectURL = vi.fn((u: string) => void revoked.push(u));
  get.mockResolvedValue({
    response: { ok: true, status: 200, blob: async () => new Blob(['%PDF']) },
  });
});

const view = (file: ViewedFile) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <FileViewerLauncher file={file} onClose={vi.fn()} />
    </QueryClientProvider>,
  );
};

const objectEl = () =>
  waitFor(() => {
    const o = document.querySelector('object');
    expect(o).not.toBeNull();
    return o!;
  });

describe('FileViewerLauncher: one fetch for every private file', () => {
  it('an intake file comes from /intake-files, with the bearer client', async () => {
    view(PDF);
    expect((await objectEl()).getAttribute('data')).toBe(created[0]);
    expect(get).toHaveBeenCalledWith(
      '/api/v1/intake-files/{file_id}',
      expect.objectContaining({ params: { path: { file_id: 'f-sop' } }, parseAs: 'stream' }),
    );
  });

  it('a message file comes from /message-files, through the same fetch', async () => {
    view({ ...PDF, kind: 'message', id: 'm-1' });
    await objectEl();
    expect(get).toHaveBeenCalledWith(
      '/api/v1/message-files/{file_id}',
      expect.objectContaining({ params: { path: { file_id: 'm-1' } }, parseAs: 'stream' }),
    );
  });

  it('download reuses the same blob, so saving costs no second request', async () => {
    view(PDF);
    const link = await screen.findByRole('link', { name: /Download/ });
    expect(link).toHaveAttribute('href', created[0]);
    expect(link).toHaveAttribute('download', 'SOP-draft-v2.pdf');
    expect(get).toHaveBeenCalledTimes(1);
  });

  it('a Word file is fetched for its Download, and says it has no preview', async () => {
    view(DOCX);
    expect(await screen.findByText('No preview for this file')).toBeVisible();
    expect(screen.getByRole('link', { name: /Download/ })).toHaveAttribute('href', created[0]);
  });

  it('an intake file retention has removed says so and is never fetched', async () => {
    view({ ...PDF, available: false });
    expect(await screen.findByText(/no longer available/)).toBeVisible();
    expect(get).not.toHaveBeenCalled();
    expect(screen.queryByRole('link', { name: /Download/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Download/ })).not.toBeInTheDocument();
  });

  it('a failure says so without the server’s words, and offers another go', async () => {
    get.mockResolvedValue({ response: { ok: false, status: 500, blob: async () => new Blob() } });
    view(PDF);
    const alert = await screen.findByRole('alert', {}, { timeout: 5000 });
    expect(alert).toHaveTextContent('We couldn’t open this file');
    expect(screen.getByRole('button', { name: 'Try again' })).toBeVisible();
  });

  it('a file that is not there (404) offers no pointless retry', async () => {
    get.mockResolvedValue({ response: { ok: false, status: 404, blob: async () => new Blob() } });
    view({ ...PDF, kind: 'message' });
    expect(await screen.findByText('This file isn’t there anymore.')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
  });

  it('the bytes are given back when the viewer closes', async () => {
    const { unmount } = view(PDF);
    await screen.findByRole('link', { name: /Download/ });
    unmount();
    await waitFor(() => expect(revoked).toContain(created[0]));
  });
});

describe('the viewer narrows what it trusts', () => {
  it('the preview is declared application/pdf outright, never the file’s own string', async () => {
    view(PDF);
    // Gated on canPreview, so the two are equal here, but asserting the
    // literal is what stops a later change to VIEWABLE widening it silently.
    expect((await objectEl()).getAttribute('type')).toBe('application/pdf');
  });

  it('the bytes are minted as a PDF or as opaque bytes, never as the server labels them', async () => {
    const html = {
      ok: true,
      status: 200,
      blob: async () => new Blob(['<script>'], { type: 'text/html' }),
    };
    get.mockResolvedValue({ response: html });
    view(PDF);
    await objectEl();
    expect(minted[0]?.type).toBe('application/pdf');
    cleanup();
    view(DOCX);
    await screen.findByRole('link', { name: /Download/ });
    expect(minted.at(-1)?.type).toBe('application/octet-stream');
  });

  it('gives back every URL it minted, including one no render ever saw', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { unmount } = render(
      <StrictMode>
        <QueryClientProvider client={client}>
          <FileViewerLauncher file={PDF} onClose={vi.fn()} />
        </QueryClientProvider>
      </StrictMode>,
    );
    await screen.findByRole('link', { name: /Download/ });
    unmount();
    // StrictMode's double mount collects the first attempt and refetches, so
    // more than one URL exists for this file and only the last reaches the DOM.
    // The one nobody saw is the one that used to stay resolvable for the life
    // of the page: another user's private document.
    await waitFor(() => {
      expect(created.length).toBeGreaterThan(0);
      expect([...revoked].sort()).toEqual([...created].sort());
    });
  });

  it('an intake id and a message id that match never share bytes', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { rerender } = render(
      <QueryClientProvider client={client}>
        <FileViewerLauncher file={PDF} onClose={vi.fn()} />
      </QueryClientProvider>,
    );
    await screen.findByRole('link', { name: /Download/ });
    rerender(
      <QueryClientProvider client={client}>
        <FileViewerLauncher file={{ ...PDF, kind: 'message' }} onClose={vi.fn()} />
      </QueryClientProvider>,
    );
    await waitFor(() => expect(get).toHaveBeenCalledTimes(2));
    expect(get.mock.calls[1]?.[0]).toBe('/api/v1/message-files/{file_id}');
    // The intake file's URL went back when the viewer let go of it.
    await waitFor(() => expect(revoked).toContain(created[0]));
  });
});

describe('intakeSharer: an intake file is always the mentee’s', () => {
  const other = { firstName: 'Amara', deleted: false };
  it('a mentor reads the mentee’s first name', () => {
    expect(intakeSharer({ side: 'mentor', other })).toEqual({ mine: false, firstName: 'Amara' });
  });
  it('the mentee reads “you”', () => {
    expect(intakeSharer({ side: 'mentee', other })).toEqual({ mine: true });
  });
  it('a deleted mentee’s name is not shown', () => {
    expect(intakeSharer({ side: 'mentor', other: { ...other, deleted: true } })).toBeUndefined();
  });
});
