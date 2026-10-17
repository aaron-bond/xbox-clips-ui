import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { INTRO_TIMING, useIntroGate } from './useIntroGate';

describe('useIntroGate', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const gate = (ready: boolean) => renderHook(({ ready }) => useIntroGate(ready), { initialProps: { ready } });
  const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));

  it('skips the intro when the data is already there', () => {
    expect(gate(true).result.current).toBe('done');
  });

  it('skips the intro when the data arrives before it is due', () => {
    const { result, rerender } = gate(false);
    expect(result.current).toBe('waiting');
    advance(INTRO_TIMING.showAfter - 100);
    rerender({ ready: true });
    expect(result.current).toBe('done');
  });

  it('shows the intro on a slow load, then leaves once the data is in', () => {
    const { result, rerender } = gate(false);
    advance(INTRO_TIMING.showAfter);
    expect(result.current).toBe('showing');
    advance(2000);
    rerender({ ready: true });
    advance(0);
    expect(result.current).toBe('leaving');
    advance(INTRO_TIMING.exit);
    expect(result.current).toBe('done');
  });

  it('keeps the intro up for its minimum, so it never flashes', () => {
    const { result, rerender } = gate(false);
    advance(INTRO_TIMING.showAfter + 100);
    rerender({ ready: true });
    advance(INTRO_TIMING.minShown - 200);
    expect(result.current).toBe('showing');
    advance(100);
    expect(result.current).toBe('leaving');
  });
});
