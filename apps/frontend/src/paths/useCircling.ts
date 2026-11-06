import type { CastMember, Figure, Path, PathAround } from '@living-stage/shared';
import { useState } from 'react';

type CirclingSetup = {
  figures: Figure[];
  figure: Figure | undefined;
  selection: string[];
  stopped: boolean;
  cast: CastMember[];
  save: (path: Path) => void;
};

export type CircleTool = { available: boolean; picking: boolean; onToggle: () => void };

export type CirclingRowProps = {
  centreName: string;
  around: PathAround;
  onChange: (around: PathAround | null) => void;
};

// One selected dancer, on any figure but the first, can be set circling another. While
// picking, the next tap on the plan says whom; the floor or the tool again cancels.
export function useCircling({ figures, figure, selection, stopped, cast, save }: CirclingSetup) {
  const [picking, setPicking] = useState(false);
  const arriving = stopped && figure && figures.indexOf(figure) > 0;
  const circler = arriving && selection.length === 1 ? selection[0]! : null;
  const pickingNow = picking && circler !== null;
  const around = circler && figure?.paths.find((path) => path.castMemberId === circler)?.around;
  const centre = around && cast.find(({ id }) => id === around.castMemberId);

  const circle = (next: PathAround | null) =>
    save({ castMemberId: circler!, points: [], around: next });

  const tool: CircleTool = {
    available: circler !== null,
    picking: pickingNow,
    onToggle: () => setPicking(!pickingNow),
  };

  function pick(castMemberId: string | null) {
    setPicking(false);
    if (castMemberId && circler && castMemberId !== circler) {
      circle({ castMemberId, clockwise: true, turns: 0 });
    }
  }

  const row: CirclingRowProps | null =
    around && centre && !pickingNow
      ? { centreName: centre.dancer?.name ?? 'Open spot', around, onChange: circle }
      : null;

  return { tool, row, picking: pickingNow, pick, cancel: () => setPicking(false) };
}
