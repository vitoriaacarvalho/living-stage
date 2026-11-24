import { fillPins, pinsFromMoves } from '@living-stage/shared';
import type { Prisma } from '../generated/prisma/client.ts';

type Tx = Prisma.TransactionClient;

// The length of the dance's song, or null for a dance without one.
export async function songLengthOf(tx: Tx, danceId: string): Promise<number | null> {
  const dance = await tx.dance.findUnique({
    where: { id: danceId },
    select: { audio: { select: { durationMs: true } } },
  });
  return dance?.audio?.durationMs ?? null;
}

// The pins of the dance's figures in order; a figure with no pin yet counts as null.
export async function pinsOf(tx: Tx, danceId: string) {
  const figures = await tx.figure.findMany({
    where: { danceId },
    orderBy: { order: 'asc' },
    select: { id: true, timeMs: true, transitionMs: true },
  });
  return figures;
}

// On getting a song: a dance never pinned is pinned where its moves put the figures;
// pins from an earlier song are kept (squeezed if this song is shorter), and figures
// added in between are slotted in among them.
export async function pinToSong(tx: Tx, danceId: string, songMs: number) {
  const figures = await pinsOf(tx, danceId);
  const neverPinned = figures.every(({ timeMs }) => timeMs === null);
  const pins = neverPinned
    ? pinsFromMoves(
        figures.map(({ transitionMs }) => transitionMs),
        songMs,
      )
    : fillPins(
        figures.map(({ timeMs }) => timeMs),
        songMs,
      );
  for (const [index, figure] of figures.entries()) {
    if (figure.timeMs === pins[index]) continue;
    await tx.figure.update({ where: { id: figure.id }, data: { timeMs: pins[index] } });
  }
}
