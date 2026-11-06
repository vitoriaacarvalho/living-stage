import {
  STAGE_DEPTH_M,
  STAGE_WIDTH_M,
  moveLengthM,
  pathCurve,
  spotsAlong,
  type PathPoint,
  type StagePoint,
} from '@living-stage/shared';
import type { CSSProperties, PointerEvent } from 'react';
import { dancerColorVar } from '../dancers/dancer-colors.ts';
import styles from './Stage.module.css';
import type { StageDancer } from './Stage.tsx';
import type { PlanScale } from './usePlanScale.ts';

// A dancer's route into the figure shown: from her spot in the figure before, through
// the points of its bend. With no points it is the straight line.
export type StagePath = { id: string; from: StagePoint; points: PathPoint[] };

// Tapping the line of a path being edited adds a point where it was tapped.
export type LineTap = {
  onPointerDown: (event: PointerEvent<SVGElement>) => void;
  onPointerUp: (event: PointerEvent<SVGElement>) => void;
};

export type DrawnPath = StagePath & { tap?: LineTap };

// Below this a dancer is taken to stay put, so no line is drawn.
const STILL_M = 0.05;
const STEPS = 48;
const START_GAP_PX = 2;
// Paths only show for selected dancers, so the line ends outside the selection ring.
const END_GAP_PX = 12;
const ARROW_PX = 8;

type Metres = { x: number; y: number };

const inMetres = ({ x, y }: StagePoint): Metres => ({ x: x * STAGE_WIDTH_M, y: y * STAGE_DEPTH_M });
const distance = (a: Metres, b: Metres) => Math.hypot(a.x - b.x, a.y - b.y);
const pair = ({ x, y }: Metres) => `${x},${y}`;

type PathLayerProps = { paths: DrawnPath[]; dancers: StageDancer[]; scale: PlanScale };

export function PathLayer({ paths, dancers, scale }: PathLayerProps) {
  return (
    <g data-testid="paths">
      {paths.map((path) => {
        const dancer = dancers.find(({ id }) => id === path.id);
        if (!dancer || moveLengthM(path.from, dancer) < STILL_M) return null;
        return <Route key={path.id} path={path} dancer={dancer} scale={scale} />;
      })}
    </g>
  );
}

type RouteProps = { path: DrawnPath; dancer: StageDancer; scale: PlanScale };

function Route({ path, dancer, scale }: RouteProps) {
  const pxToM = (px: number) => px / scale.pxPerM;
  const radius = pxToM(scale.dotPx / 2);
  const from = inMetres(path.from);
  const to = inMetres(dancer);
  const line = spotsAlong(pathCurve(path.from, dancer, path.points), STEPS)
    .map(inMetres)
    .filter(
      (spot) =>
        distance(spot, from) > radius + pxToM(START_GAP_PX) &&
        distance(spot, to) > radius + pxToM(END_GAP_PX),
    );
  const color = {
    '--dot': dancer.color === null ? 'var(--stage-line)' : dancerColorVar(dancer.color),
  } as CSSProperties;
  return (
    <g style={color} data-testid="path">
      <circle
        className={styles.pathStart}
        cx={from.x}
        cy={from.y}
        r={radius}
        data-testid="path-start"
      />
      {line.length >= 2 && (
        <>
          <polyline className={styles.route} points={line.map(pair).join(' ')} />
          {path.tap && (
            <polyline
              className={styles.routeTap}
              points={line.map(pair).join(' ')}
              data-testid="path-line"
              {...path.tap}
            />
          )}
          <Arrowhead
            tip={line[line.length - 1]!}
            behind={line[line.length - 2]!}
            size={pxToM(ARROW_PX)}
          />
        </>
      )}
    </g>
  );
}

function Arrowhead({ tip, behind, size }: { tip: Metres; behind: Metres; size: number }) {
  const length = distance(tip, behind) || 1;
  const along = { x: (tip.x - behind.x) / length, y: (tip.y - behind.y) / length };
  const base = { x: tip.x - along.x * size, y: tip.y - along.y * size };
  const across = { x: -along.y * size * 0.55, y: along.x * size * 0.55 };
  const corners = [
    tip,
    { x: base.x + across.x, y: base.y + across.y },
    {
      x: base.x - across.x,
      y: base.y - across.y,
    },
  ];
  return <polygon className={styles.arrow} points={corners.map(pair).join(' ')} />;
}
