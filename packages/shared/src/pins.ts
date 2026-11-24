// A pin is the moment in the song, in ms, when a figure is reached. The pins of a dance
// rise with the figures' order; moving one pin never moves another.

// How close a dragged pin may come to its neighbours.
export const PIN_GAP_MS = 500;

// Where a new last figure lands after the one before it.
export const NEW_PIN_AFTER_MS = 4000;

// Pins that fit the song: squeezed in proportion when the last one would run past its end.
export function fitPins(pins: number[], songMs: number): number[] {
  const last = pins.at(-1) ?? 0;
  if (last <= songMs) return pins;
  return pins.map((pin) => Math.round((pin * songMs) / last));
}

// Pins where the move times put the figures today: the first at the start of the song,
// each next one when its move ends.
export function pinsFromMoves(transitionsMs: number[], songMs: number): number[] {
  let at = 0;
  const pins = transitionsMs.map((transitionMs, index) => (at += index === 0 ? 0 : transitionMs));
  return fitPins(pins, songMs);
}

// Pins for figures some of which have none (added while the dance had no song): those
// keep their moments, and each missing one lands like a copy would, halfway to the next
// pinned figure or after the last.
export function fillPins(pins: (number | null)[], songMs: number): number[] {
  const filled: number[] = [];
  for (const [index, pin] of pins.entries()) {
    if (pin !== null) {
      filled.push(pin);
      continue;
    }
    const next = pins.slice(index + 1).find((later) => later !== null);
    const before = filled.at(-1) ?? 0;
    filled.push(next == null ? newPin(filled) : Math.round((before + next) / 2));
  }
  return fitPins(filled, songMs);
}

// A new last figure, a few seconds after the last pin. Past the song's end, all the
// pins are then squeezed to fit (fitPins), so no two figures ever share a moment.
export function newPin(pins: number[]): number {
  const last = pins.at(-1);
  return last === undefined ? 0 : last + NEW_PIN_AFTER_MS;
}

// A copy placed right after the figure at index: halfway to the next pin.
export function copyPin(pins: number[], index: number): number {
  const next = pins[index + 1];
  if (next === undefined) return newPin(pins);
  return Math.round((pins[index]! + next) / 2);
}

// Where the figure at index may be dragged: between its neighbours, inside the song.
export function pinRange(pins: number[], index: number, songMs: number) {
  const before = pins[index - 1];
  const after = pins[index + 1];
  return {
    minMs: before === undefined ? 0 : before + PIN_GAP_MS,
    maxMs: after === undefined ? songMs : after - PIN_GAP_MS,
  };
}

export function isInPinRange(pins: number[], index: number, songMs: number, timeMs: number) {
  const { minMs, maxMs } = pinRange(pins, index, songMs);
  return timeMs >= minMs && timeMs <= maxMs;
}
