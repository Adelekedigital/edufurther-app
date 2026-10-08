import { StrictMode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AnswerFile } from '@/types/booking';
import { IntakeFileViewer } from './IntakeFileViewer';

const PDF: AnswerFile = {
  id: 'f-sop',
  filename: 'SOP-draft-v2.pdf',
  contentType: 'application/pdf',
  size: 182_400,
  available: true,
};
const DOCX: AnswerFile = {
  ...PDF,
  id: 'f-cv',
  filename: 'CV-2026.docx',
  contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

const get = vi.fn();
vi.mock('@/lib/api/data/http', () => ({ api: { GET: (...a: unknown[]) => get(...a) } }));
vi.mock('@/lib/api/data/session', () => ({
  useSession: () => ({ status: 'member', userId: 'u' }),
  sessionKey: () => 'u',
}));

const created: string[] = [];
const revoked: string[] = [];

beforeEach(() => {
  get.mockReset();
  created.length = 0;
  revoked.length = 0;
  let n = 0;
  URL.createObjectURL = vi.fn(() => {
    const u = `blob:mock/${++n}`;
    created.push(u);
    return u;
  });
  URL.revokeObjectURL = vi.fn((u: string) => void revoked.push(u));
  get.mockResolvedValue({ response: { ok: true, status: 200, blob: async () => new Blob(['%PDF']) } });
});

const view = (file: AnswerFile, onClose = vi.fn()) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <IntakeFileViewer file={file} onClose={onClose} />
    </QueryClientProvider>,
  );
};

describe('IntakeFileViewer — a file is read in the app, not just acquired', () => {
  it('renders a PDF in the browser’s own viewer', async () => {
    view(PDF);
    const obj = await waitFor(() => {
      const o = document.querySelector('object');
      expect(o).not.toBeNull();
      return o!;
    });
    expect(obj.getAttribute('type')).toBe('application/pdf');
    expect(obj.getAttribute('data')).toBe(created[0]);
    // The name, so a screen reader does not meet an unlabelled embed.
    expect(obj.getAttribute('aria-label')).toBe('SOP-draft-v2.pdf');
  });

  it('download reuses the same blob, so saving costs no second request', async () => {
    view(PDF);
    const link = await screen.findByRole('link', { name: /Download/ });
    expect(link).toHaveAttribute('href', created[0]);
    expect(link).toHaveAttribute('download', 'SOP-draft-v2.pdf');
    expect(get).toHaveBeenCalledTimes(1);
  });

  it('a Word file says it cannot be shown, and still offers Download', async () => {
    view(DOCX);
    expect(await screen.findByText(/Word documents can’t be shown here/)).toBeVisible();
    expect(document.querySelector('object')).toBeNull();
    expect(screen.getByRole('link', { name: /Download/ })).toBeVisible();
  });

  it('a file retention has removed says so and is never fetched', async () => {
    view({ ...PDF, available: false });
    expect(await screen.findByText(/no longer available/)).toBeVisible();
    expect(get).not.toHaveBeenCalled();
    expect(screen.queryByRole('link', { name: /Download/ })).not.toBeInTheDocument();
  });

  it('a failure says so without the server’s words, and offers another go', async () => {
    get.mockResolvedValue({
      response: { ok: false, status: 500, blob: async () => new Blob() },
    });
    view(PDF);
    const alert = await screen.findByRole('alert', {}, { timeout: 5000 });
    expect(alert).toHaveTextContent('We couldn’t open this file.');
    expect(await screen.findByRole('button', { name: 'Try again' })).toBeVisible();
  });

  it('a file that has gone since the panel loaded offers no pointless retry', async () => {
    get.mockResolvedValue({
      response: { ok: false, status: 404, blob: async () => new Blob() },
    });
    view(PDF);
    expect(await screen.findByText('This file isn’t there any more.')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
  });

  it('the bytes are given back when the viewer closes', async () => {
    const { unmount } = view(PDF);
    await screen.findByRole('link', { name: /Download/ });
    unmount();
    await waitFor(() => expect(revoked).toContain(created[0]));
  });

  it('Escape closes it', async () => {
    const onClose = vi.fn();
    view(PDF, onClose);
    await screen.findByRole('link', { name: /Download/ });
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });
});

describe('the viewer narrows what it trusts', () => {
  it('the preview is declared application/pdf outright, never the file’s own string', async () => {
    view(PDF);
    const obj = await waitFor(() => {
      const o = document.querySelector('object');
      expect(o).not.toBeNull();
      return o!;
    });
    // Gated on canPreview, so the two are equal here — but asserting the
    // literal is what stops a later change to VIEWABLE widening it silently.
    expect(obj.getAttribute('type')).toBe('application/pdf');
  });

  it('gives back every URL it minted, including one no render ever saw', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const { unmount } = render(
      <StrictMode>
        <QueryClientProvider client={client}>
          <IntakeFileViewer file={PDF} onClose={vi.fn()} />
        </QueryClientProvider>
      </StrictMode>,
    );
    await screen.findByRole('link', { name: /Download/ });
    unmount();
    // StrictMode's double mount collects the first attempt and refetches, so
    // more than one URL exists for this file and only the last reaches the DOM.
    // The one nobody saw is the one that used to stay resolvable for the life
    // of the page — another user's private document.
    await waitFor(() => {
      expect(created.length).toBeGreaterThan(0);
      expect([...revoked].sort()).toEqual([...created].sort());
    });
  });
});
