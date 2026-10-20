import { act, renderHook } from '@testing-library/react';
import { useRequiredFields } from './useRequiredFields';

describe('useRequiredFields', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    vi.useRealTimers();
  });

  it('shows nothing until Save is tried, then every gap, focusing the first', () => {
    vi.useFakeTimers();
    document.body.innerHTML = '<input data-ff="name" /><input data-ff="country" />';
    window.scrollBy = vi.fn();
    const { result } = renderHook(() => useRequiredFields(['name', 'country'] as const));
    expect(result.current.errors).toEqual([]);
    expect(result.current.formError).toBe(false);
    let passed = true;
    act(() => {
      passed = result.current.check();
    });
    expect(passed).toBe(false);
    expect(result.current.errors).toEqual(['name', 'country']);
    expect(result.current.has('country')).toBe(true);
    expect(result.current.formError).toBe(true);
    act(() => vi.runAllTimers());
    expect(document.activeElement).toBe(document.querySelector('[data-ff="name"]'));
  });

  it('with a root, the gap is looked for there, not in another panel kept in the page', () => {
    vi.useFakeTimers();
    document.body.innerHTML =
      '<div hidden id="other"><input data-ff="name" /></div><div id="mine"><input data-ff="name" /></div>';
    window.scrollBy = vi.fn();
    const root = { current: document.getElementById('mine') };
    const { result } = renderHook(() => useRequiredFields(['name'] as const, root));
    act(() => {
      result.current.check();
    });
    act(() => vi.runAllTimers());
    expect(document.activeElement).toBe(document.querySelector('#mine input'));
  });

  it('errors follow the fields as they are fixed; none left clears the form line', () => {
    const { result, rerender } = renderHook(({ gaps }) => useRequiredFields(gaps), {
      initialProps: { gaps: ['name', 'langs'] as string[] },
    });
    act(() => void result.current.check());
    rerender({ gaps: ['langs'] });
    expect(result.current.errors).toEqual(['langs']);
    rerender({ gaps: [] });
    expect(result.current.formError).toBe(false);
  });

  it('nothing missing: check passes; reset (Discard) hides the errors', () => {
    const { result, rerender } = renderHook(({ gaps }) => useRequiredFields(gaps), {
      initialProps: { gaps: [] as string[] },
    });
    let passed = false;
    act(() => {
      passed = result.current.check();
    });
    expect(passed).toBe(true);
    rerender({ gaps: ['name'] });
    act(() => void result.current.check());
    act(() => result.current.reset());
    expect(result.current.errors).toEqual([]);
  });
});
