import { renderHook } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { usePhone } from './usePhone.ts';

afterEach(() => {
  vi.unstubAllGlobals();
});

function matching(matched: string | null) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query === matched,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

test('is portrait on a narrow screen', () => {
  matching('(max-width: 599px)');
  expect(renderHook(() => usePhone()).result.current).toBe('portrait');
});

test('is landscape on a wide, short screen', () => {
  matching('(min-width: 600px) and (max-height: 499px)');
  expect(renderHook(() => usePhone()).result.current).toBe('landscape');
});

test('is no phone on an iPad or desktop', () => {
  matching(null);
  expect(renderHook(() => usePhone()).result.current).toBeNull();
});
