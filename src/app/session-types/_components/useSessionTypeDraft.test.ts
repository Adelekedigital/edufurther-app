import { renderHook } from '@testing-library/react';
import type { MentorDefaults } from '@/lib/api/data/sessionTypes';
import { useSessionTypeDraft } from './useSessionTypeDraft';

const defaults = (over: Partial<MentorDefaults> = {}): MentorDefaults => ({
  durationMin: null,
  noticeHours: null,
  windowDays: null,
  breakMin: null,
  requiresApproval: true,
  ...over,
});

describe('useSessionTypeDraft: the platform cap (Codex review of #100)', () => {
  it('brings a window above the cap within it once the defaults arrive, without an unsaved change', () => {
    const { result, rerender } = renderHook(({ d }) => useSessionTypeDraft(undefined, null, d), {
      initialProps: { d: { data: null as MentorDefaults | null, error: null } },
    });
    // The blank draft starts at four weeks.
    expect(result.current.draft.windowDays).toBe(28);
    rerender({ d: { data: defaults({ maxWindowDays: 14 }), error: null } });
    expect(result.current.draft.windowDays).toBe(14);
    expect(result.current.initial.windowDays).toBe(14);
  });

  it('leaves a window within the cap alone', () => {
    const { result } = renderHook(() =>
      useSessionTypeDraft(undefined, null, { data: defaults({ maxWindowDays: 56 }), error: null }),
    );
    expect(result.current.draft.windowDays).toBe(28);
  });
});
