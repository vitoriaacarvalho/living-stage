import { INVITE_CODE_ALPHABET, INVITE_CODE_LENGTH } from '@living-stage/shared';
import { randomInt } from 'node:crypto';

export function generateInviteCode(): string {
  return Array.from(
    { length: INVITE_CODE_LENGTH },
    () => INVITE_CODE_ALPHABET[randomInt(INVITE_CODE_ALPHABET.length)],
  ).join('');
}
