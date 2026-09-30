import { act, renderHook } from '@testing-library/react';
import type { MentorDefaults } from '@/lib/api/data/sessionTypes';
import { SESSION_TEMPLATES } from '@/lib/utils/sessionTemplates';
import { useSessionTypeDraft } from './useSessionTypeDraft';

const defaults = (over: Partial<MentorDefaults> = {}): MentorDefaults => ({
  durationMin: null,
  noticeHours: null,
  windowDays: null,
  breakMin: null,
  requiresApproval: true,
  ...over,
});

describe('useSessionTypeDraft: the platform cap', () => {
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

  it('a template settling on its own rules as a low cap arrives keeps them, within the cap', () => {
    // Mock visa interview is 45 min; the mentor's default is 60, so it settles on its own rules.
    const tmpl = SESSION_TEMPLATES.find((t) => t.key === 'mock-visa-interview')!;
    const { result, rerender } = renderHook(({ d }) => useSessionTypeDraft(undefined, tmpl, d), {
      initialProps: { d: { data: null as MentorDefaults | null, error: null } },
    });
    rerender({ d: { data: defaults({ durationMin: 60, maxWindowDays: 14 }), error: null } });
    expect(result.current.draft).toMatchObject({ rules: 'custom', durationMin: 45 });
    expect(result.current.draft.windowDays).toBeLessThanOrEqual(14);
  });

  it('custom rules chosen before the defaults load are seeded from them when they arrive', () => {
    const { result, rerender } = renderHook(({ d }) => useSessionTypeDraft(undefined, null, d), {
      initialProps: { d: { data: null as MentorDefaults | null, error: null } },
    });
    act(() => {
      const next = result.current.seedCustom({ rules: 'custom' });
      result.current.setDraft((x) => ({ ...x, ...next }));
    });
    // The blank draft's four weeks until the defaults arrive…
    expect(result.current.draft.windowDays).toBe(28);
    rerender({
      d: {
        data: defaults({ durationMin: 45, platformWindowDays: 56, maxWindowDays: 56 }),
        error: null,
      },
    });
    // …then the mentor's values (their length, the platform's eight weeks).
    expect(result.current.draft).toMatchObject({
      rules: 'custom',
      durationMin: 45,
      windowDays: 56,
    });
  });
});
