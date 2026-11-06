import { randomUUID } from 'node:crypto';
import { copyTitle } from '@living-stage/shared';
import type {
  CastMember,
  Dance,
  Figure,
  Path,
  Position,
  Prisma,
} from '../generated/prisma/client.ts';

export type DanceSource = Omit<Dance, 'id' | 'createdAt'> & {
  cast: Omit<CastMember, 'danceId'>[];
  figures: (Omit<Figure, 'danceId'> & {
    positions: Omit<Position, 'figureId'>[];
    paths: Omit<Path, 'figureId'>[];
  })[];
};

export type DanceCopy = {
  dance: Prisma.DanceUncheckedCreateInput & { id: string };
  cast: Prisma.CastMemberCreateManyInput[];
  figures: Prisma.FigureCreateManyInput[];
  positions: Prisma.PositionCreateManyInput[];
  paths: Prisma.PathCreateManyInput[];
};

// Ids are made here rather than by the database so positions and paths can point at the
// new rows.
// Cast members keep their createdAt because it is what orders the cast.
export function danceCopy({ cast, figures, ...source }: DanceSource): DanceCopy {
  const danceId = randomUUID();
  const castIds = new Map(cast.map(({ id }) => [id, randomUUID()]));
  const figureIds = new Map(figures.map(({ id }) => [id, randomUUID()]));
  const { schoolId, title, showGuides, labelMode, colorMode, durationMs } = source;

  return {
    dance: {
      id: danceId,
      schoolId,
      title: copyTitle(title),
      showGuides,
      labelMode,
      colorMode,
      durationMs,
    },
    cast: cast.map(({ id, dancerId, role, createdAt }) => ({
      id: castIds.get(id)!,
      danceId,
      dancerId,
      role,
      createdAt,
    })),
    figures: figures.map(({ id, order, name, transitionMs }) => ({
      id: figureIds.get(id)!,
      danceId,
      order,
      name,
      transitionMs,
    })),
    positions: figures.flatMap(({ id, positions }) =>
      positions.map(({ castMemberId, x, y }) => ({
        figureId: figureIds.get(id)!,
        castMemberId: castIds.get(castMemberId)!,
        x,
        y,
      })),
    ),
    paths: figures.flatMap(({ id, paths }) =>
      paths.map(({ castMemberId, points, aroundId, clockwise, turns }) => ({
        figureId: figureIds.get(id)!,
        castMemberId: castIds.get(castMemberId)!,
        points: points as Prisma.InputJsonValue,
        aroundId: aroundId && castIds.get(aroundId)!,
        clockwise,
        turns,
      })),
    ),
  };
}
