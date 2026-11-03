// Numbers of the skin-1 … skin-4 and hair-1 … hair-3 tokens, like DancerColor.
export const SKIN_COUNT = 4;
export const HAIR_COUNT = 3;

export type BallerinaLook = { skin: number; hair: number };

// FNV-1a: tiny and stable, so a dancer looks the same on every device and in every dance.
function hash(text: string): number {
  let value = 0x811c9dc5;
  for (let index = 0; index < text.length; index++) {
    value ^= text.charCodeAt(index);
    value = Math.imul(value, 0x01000193);
  }
  return value >>> 0;
}

export function ballerinaLook(dancerId: string): BallerinaLook {
  const value = hash(dancerId);
  return {
    skin: (value % SKIN_COUNT) + 1,
    hair: (Math.floor(value / SKIN_COUNT) % HAIR_COUNT) + 1,
  };
}
