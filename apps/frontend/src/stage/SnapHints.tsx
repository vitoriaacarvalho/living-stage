import { STAGE_DEPTH_M, STAGE_WIDTH_M, type SnapHint, type StagePoint } from '@living-stage/shared';
import styles from './Stage.module.css';
import type { PlanScale } from './usePlanScale.ts';

const LABEL_PX = 12;
const LABEL_LIFT_PX = 8;

const inMetres = ({ x, y }: StagePoint) => ({ x: x * STAGE_WIDTH_M, y: y * STAGE_DEPTH_M });

const formatGap = (metres: number) => `${Number(metres.toFixed(1))} m`;

type SnapHintsProps = { hints: SnapHint[]; scale: PlanScale };

// Drawn in metres inside the plan's SVG, with the label sized in pixels through the scale.
export function SnapHints({ hints, scale }: SnapHintsProps) {
  if (hints.length === 0) return null;
  return (
    <g data-testid="snap-hints">
      {hints.map((hint, index) =>
        hint.kind === 'align' ? (
          <Segment key={index} from={hint.from} to={hint.to} className={styles.alignHint} />
        ) : (
          <GapHintLine key={index} hint={hint} scale={scale} />
        ),
      )}
    </g>
  );
}

type SegmentProps = { from: StagePoint; to: StagePoint; className: string | undefined };

function Segment({ from, to, className }: SegmentProps) {
  const [a, b] = [inMetres(from), inMetres(to)];
  return <line className={className} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />;
}

type GapHintLineProps = { hint: Extract<SnapHint, { kind: 'gap' }>; scale: PlanScale };

function GapHintLine({ hint, scale }: GapHintLineProps) {
  const [first, middle, last] = hint.through;
  const halves = [
    [first, middle],
    [middle, last],
  ] as const;
  return (
    <>
      <Segment from={first} to={last} className={styles.gapHint} />
      {halves.map(([from, to], index) => {
        const [a, b] = [inMetres(from), inMetres(to)];
        return (
          <text
            key={index}
            className={styles.gapLabel}
            x={(a.x + b.x) / 2}
            y={(a.y + b.y) / 2 - LABEL_LIFT_PX / scale.pxPerM}
            fontSize={LABEL_PX / scale.pxPerM}
          >
            {formatGap(hint.gapM)}
          </text>
        );
      })}
    </>
  );
}
