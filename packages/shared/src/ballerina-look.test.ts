import { describe, expect, test } from 'vitest';
import { HAIR_COUNT, SKIN_COUNT, ballerinaLook } from './ballerina-look.ts';

const ids = Array.from({ length: 200 }, (_, index) => `dancer-${index}`);

describe('ballerinaLook', () => {
  test('gives the same dancer the same look every time', () => {
    expect(ballerinaLook('cm1abc')).toEqual(ballerinaLook('cm1abc'));
  });

  test('keeps skin within the skin tokens', () => {
    const skins = ids.map((id) => ballerinaLook(id).skin);
    expect(skins.every((skin) => skin >= 1 && skin <= SKIN_COUNT)).toBe(true);
  });

  test('keeps hair within the hair tokens', () => {
    const hairs = ids.map((id) => ballerinaLook(id).hair);
    expect(hairs.every((hair) => hair >= 1 && hair <= HAIR_COUNT)).toBe(true);
  });

  test('uses every skin and hair pairing across a large cast', () => {
    const pairings = new Set(ids.map((id) => JSON.stringify(ballerinaLook(id))));
    expect(pairings.size).toBe(SKIN_COUNT * HAIR_COUNT);
  });

  test('gives an empty id a look', () => {
    expect(ballerinaLook('')).toEqual({ skin: expect.any(Number), hair: expect.any(Number) });
  });
});
