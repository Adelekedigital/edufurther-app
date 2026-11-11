import { renderHook } from '@testing-library/react';
import { useAssistOutcome } from './useAssistOutcome';

const track = vi.hoisted(() => vi.fn());
vi.mock('@/lib/analytics/track', () => ({ track }));

beforeEach(() => track.mockClear());

describe('useAssistOutcome', () => {
  it('a kept AI change is accepted once, with its field and mode', () => {
    const { result } = renderHook(() => useAssistOutcome('mentee_bio'));
    result.current.onAiChange({ kind: 'applied', mode: 'improve' });
    result.current.accepted();
    result.current.accepted();
    expect(track).toHaveBeenCalledOnce();
    expect(track).toHaveBeenCalledWith('writing_assist_used', {
      field: 'mentee_bio',
      mode: 'improve',
      outcome: 'accepted',
    });
  });

  it('Undo or a thrown-away edit is discarded; nothing pending sends nothing', () => {
    const { result } = renderHook(() => useAssistOutcome('mentor_about'));
    result.current.accepted();
    result.current.discarded();
    expect(track).not.toHaveBeenCalled();
    result.current.onAiChange({ kind: 'applied', mode: 'draft' });
    result.current.onAiChange({ kind: 'undone' });
    result.current.applied('draft');
    result.current.discarded();
    expect(track.mock.calls).toEqual([
      ['writing_assist_used', { field: 'mentor_about', mode: 'draft', outcome: 'discarded' }],
      ['writing_assist_used', { field: 'mentor_about', mode: 'draft', outcome: 'discarded' }],
    ]);
  });

  it('a later change replaces the earlier one: one outcome, the last mode', () => {
    const { result } = renderHook(() => useAssistOutcome('mentor_about'));
    result.current.onAiChange({ kind: 'applied', mode: 'draft' });
    result.current.onAiChange({ kind: 'applied', mode: 'improve' });
    result.current.accepted();
    expect(track.mock.calls).toEqual([
      ['writing_assist_used', { field: 'mentor_about', mode: 'improve', outcome: 'accepted' }],
    ]);
  });

  it('keeps what is pending across renders', () => {
    const { result, rerender } = renderHook(() => useAssistOutcome('mentor_about'));
    result.current.onAiChange({ kind: 'applied', mode: 'draft' });
    rerender();
    result.current.accepted();
    expect(track).toHaveBeenCalledOnce();
  });
});
