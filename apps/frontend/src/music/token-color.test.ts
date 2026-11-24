import { afterEach, describe, expect, test } from 'vitest';
import { tokenColor } from './token-color.ts';

afterEach(() => {
  document.documentElement.style.removeProperty('--primary');
});

describe('tokenColor', () => {
  test('reads the token as it is', () => {
    document.documentElement.style.setProperty('--primary', '#B4476E');
    expect(tokenColor('--primary')).toBe('#B4476E');
  });

  test('fades the token', () => {
    document.documentElement.style.setProperty('--primary', '#B4476E');
    expect(tokenColor('--primary', 0.45)).toBe('rgba(180, 71, 110, 0.45)');
  });

  test('passes on a token that is not a hex color', () => {
    document.documentElement.style.setProperty('--primary', 'rebeccapurple');
    expect(tokenColor('--primary', 0.45)).toBe('rebeccapurple');
  });
});
