import { parseInviteCode } from '@living-stage/shared';
import { expect, test } from 'vitest';
import { generateInviteCode } from './generate-invite-code.ts';

test('makes a code that parses as valid', () => {
  const code = generateInviteCode();
  expect(parseInviteCode(code)).toBe(code);
});

test('makes a different code each time', () => {
  expect(generateInviteCode()).not.toBe(generateInviteCode());
});
