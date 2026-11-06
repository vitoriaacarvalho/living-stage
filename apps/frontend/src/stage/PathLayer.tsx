import {
  STAGE_DEPTH_M,
  STAGE_WIDTH_M,
  moveLengthM,
  orbitSpot,
  pathCurve,
  spotAlong,
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
export type StagePath = {
  id: string;
  from: StagePoint;
  points: PathPoint[];
  around?: StageAround;
};

// The dancer circled: her spot in the figure before and the bend of her own route, so the
// circle follows her live as she walks it.
export type StageAround = {
  id: string;
  from: StagePoint;
  points: PathPoint[];
  clockwise: boolean;
  turns: number;
};

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
        if (!dancer) return null;
        const spots = routeSpots(path, dancer, dancers);
        if (!spots) return null;
        return <Route key={path.id} path={path} spots={spots} dancer={dancer} scale={scale} />;
      })}
    </g>
  );
}

// A circle around someone is drawn even when she comes back to the same spot; any other
// route needs her to move. A circle whose dancer is off the plan is drawn straight.
function routeSpots(path: StagePath, dancer: StageDancer, dancers: StageDancer[]) {
  const centre = path.around && dancers.find(({ id }) => id === path.around!.id);
  if (path.around && centre) {
    const { from, points, clockwise, turns } = path.around;
    const centreRoute = pathCurve(from, centre, points);
    const orbit = {
      start: path.from,
      end: dancer,
      centreAt: (progress: number) => spotAlong(centreRoute, progress),
      clockwise,
      turns,
    };
    const steps = STEPS * (turns + 1);
    return Array.from({ length: steps + 1 }, (_, step) => orbitSpot(orbit, step / steps));
  }
  if (moveLengthM(path.from, dancer) < STILL_M) return null;
  return spotsAlong(pathCurve(path.from, dancer, path.points), STEPS);
}

// Only the ends are trimmed, so a circle passing back by her start keeps its line.
function trimmed(line: Metres[], from: Metres, to: Metres, gaps: { start: number; end: number }) {
  const first = line.findIndex((spot) => distance(spot, from) > gaps.start);
  const last = line.findLastIndex((spot) => distance(spot, to) > gaps.end);
  return first === -1 || last < first ? [] : line.slice(first, last + 1);
}

type RouteProps = {
  path: DrawnPath;
  spots: StagePoint[];
  dancer: StageDancer;
  scale: PlanScale;
};

function Route({ path, spots, dancer, scale }: RouteProps) {
  const pxToM = (px: number) => px / scale.pxPerM;
  const radius = pxToM(scale.dotPx / 2);
  const from = inMetres(path.from);
  const to = inMetres(dancer);
  const line = trimmed(spots.map(inMetres), from, to, {
    start: radius + pxToM(START_GAP_PX),
    end: radius + pxToM(END_GAP_PX),
  });
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
