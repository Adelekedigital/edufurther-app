import { describe, expect, it, vi } from 'vitest';

const post = vi.fn();
vi.mock('./http', () => ({ api: { POST: (...a: unknown[]) => post(...a) } }));

const { ASSIST_COPY, requestAssist } = await import('./writingAssist');
const { aboutBody } = await import('./profileEdit');

const res = (status: number, data?: unknown) => ({
  data,
  error: status >= 400 ? { title: 'x' } : undefined,
  response: new Response(null, { status }),
});

describe('requestAssist', () => {
  it('sends the text only to improve, and reads the prompt version', async () => {
    post.mockResolvedValueOnce(res(200, { text: 'Drafted.', prompt_version: 'v1' }));
    await expect(requestAssist('mentor_about', 'draft', 'ignored')).resolves.toEqual({
      text: 'Drafted.',
      promptVersion: 'v1',
    });
    expect(post).toHaveBeenLastCalledWith(
      '/api/v1/me/writing-assist',
      expect.objectContaining({ body: { field: 'mentor_about', mode: 'draft' } }),
    );
    // Bounded: a hung call ends in our copy, not an endless spinner.
    expect(post.mock.lastCall![1].signal).toBeInstanceOf(AbortSignal);
    post.mockResolvedValueOnce(res(200, { text: 'Better.', prompt_version: 'v1' }));
    await requestAssist('mentor_about', 'improve', 'better');
    expect(post).toHaveBeenLastCalledWith(
      '/api/v1/me/writing-assist',
      expect.objectContaining({ body: { field: 'mentor_about', mode: 'improve', text: 'better' } }),
    );
  });

  it('words the limit and the outage in our copy', async () => {
    post.mockResolvedValueOnce(res(429));
    await expect(requestAssist('mentor_about', 'draft', '')).rejects.toThrow(ASSIST_COPY.limit);
    post.mockResolvedValueOnce(res(503));
    await expect(requestAssist('mentor_about', 'draft', '')).rejects.toThrow(
      ASSIST_COPY.unavailable,
    );
  });
});

describe('requestAssist: an empty success', () => {
  it('reads a 200 with no body as unavailable, never as an empty draft', async () => {
    post.mockResolvedValueOnce({ data: undefined, error: undefined, response: new Response(null) });
    await expect(requestAssist('mentor_about', 'draft', '')).rejects.toThrow(
      ASSIST_COPY.unavailable,
    );
  });
});

describe('aboutBody', () => {
  it('stamps an untouched draft with its prompt, and clears both otherwise', () => {
    expect(aboutBody(' Mine ', { drafted: true, promptVersion: 'v1' })).toEqual({
      about_me: 'Mine',
      about_me_drafted: true,
      about_me_prompt_version: 'v1',
    });
    // Clearing is drafted:false alone: a version without drafted:true is refused (422).
    expect(aboutBody('Mine', { drafted: false, promptVersion: 'v1' })).toEqual({
      about_me: 'Mine',
      about_me_drafted: false,
    });
    expect(aboutBody('  ')).toEqual({ about_me: null });
  });

  it('leaves a draft saved earlier alone when it is saved again untouched', () => {
    // Drafted, but no AI run this time, so no version: the stored stamp and version stay.
    expect(aboutBody('A draft.', { drafted: true, promptVersion: null })).toEqual({
      about_me: 'A draft.',
    });
  });
});
