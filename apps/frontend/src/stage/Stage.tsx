import {
  SIDE_WING_DEPTH,
  STAGE_CENTER,
  STAGE_DEPTH_M,
  STAGE_QUARTERS,
  STAGE_WIDTH_M,
  UPSTAGE_WING_DEPTH,
  type DancerColor,
} from '@living-stage/shared';
import { type CSSProperties, type PointerEvent, useRef } from 'react';
import { dancerColorVar } from '../dancers/dancer-colors.ts';
import styles from './Stage.module.css';
import { type StageEditing, useDancerDrag } from './useDancerDrag.ts';

export type { StageEditing } from './useDancerDrag.ts';

const sideWing = SIDE_WING_DEPTH * STAGE_WIDTH_M;
const upstageWing = UPSTAGE_WING_DEPTH * STAGE_DEPTH_M;
const planWidth = STAGE_WIDTH_M + 2 * sideWing;
const planHeight = STAGE_DEPTH_M + upstageWing;

export const STAGE_PLAN_ASPECT = planWidth / planHeight;

// Stage units stretch differently on each axis (12 m across, 8 m deep), so the
// plan is drawn in metres to keep the floor's proportions.
const geometry = {
  '--plan-aspect': `${planWidth} / ${planHeight}`,
  '--side-wing': `${(sideWing / planWidth) * 100}%`,
  '--upstage-wing': `${(upstageWing / planHeight) * 100}%`,
} as CSSProperties;

// A dancer's spot in stage units; open marks a spot whose dancer left the roster.
// role is a second line under the label.
export type StageDancer = {
  id: string;
  dancerId: string | null;
  label: string;
  role: string | null;
  color: DancerColor | null;
  x: number;
  y: number;
  open: boolean;
};

// Without edit the plan is only shown, as in print and thumbnails.
export type StageProps = { showGuides: boolean; dancers?: StageDancer[]; edit?: StageEditing };

export function Stage({ showGuides, dancers = [], edit }: StageProps) {
  const planRef = useRef<HTMLDivElement>(null);
  const { shown, handlers } = useDancerDrag({ dancers, edit, planRef });

  function pressFloor() {
    if (edit && edit.selectedIds.length > 0) edit.onSelect([]);
  }

  return (
    <div
      className={styles.stage}
      style={geometry}
      role="img"
      aria-label="Stage seen from above, audience at the bottom"
    >
      <div
        ref={planRef}
        className={edit ? `${styles.plan} ${styles.editable}` : styles.plan}
        onPointerDown={pressFloor}
      >
        <svg
          className={styles.svg}
          viewBox={`${-sideWing} ${-upstageWing} ${planWidth} ${planHeight}`}
        >
          <rect className={styles.floor} width={STAGE_WIDTH_M} height={STAGE_DEPTH_M} />
          {showGuides && <Guides />}
          <line
            className={styles.edge}
            x1={0}
            y1={STAGE_DEPTH_M}
            x2={STAGE_WIDTH_M}
            y2={STAGE_DEPTH_M}
          />
        </svg>
        <span className={`${styles.zone} ${styles.upstage}`}>Upstage</span>
        <span className={`${styles.zone} ${styles.leftWing}`}>Wing</span>
        <span className={`${styles.zone} ${styles.rightWing}`}>Wing</span>
        {shown.map((dancer) => (
          <DancerDot
            key={dancer.id}
            dancer={dancer}
            selected={edit?.selectedIds.includes(dancer.id) ?? false}
            hit={edit && handlers(dancer)}
          />
        ))}
      </div>
      <div className={styles.audience}>
        <span className={styles.zone}>Audience</span>
      </div>
    </div>
  );
}

function Guides() {
  return (
    <g data-testid="guides">
      {STAGE_QUARTERS.map((at) => (
        <GuidePair key={at} at={at} className={styles.quarter} />
      ))}
      <GuidePair at={STAGE_CENTER} className={styles.center} />
    </g>
  );
}

function GuidePair({ at, className }: { at: number; className?: string }) {
  const x = at * STAGE_WIDTH_M;
  const y = at * STAGE_DEPTH_M;
  return (
    <>
      <line className={className} x1={x} y1={0} x2={x} y2={STAGE_DEPTH_M} />
      <line className={className} x1={0} y1={y} x2={STAGE_WIDTH_M} y2={y} />
    </>
  );
}

export function isOffStage({ x, y }: StageDancer): boolean {
  return x < 0 || x > 1 || y < 0;
}

type DotHit = Record<
  'onPointerDown' | 'onPointerMove' | 'onPointerUp' | 'onPointerCancel',
  (event: PointerEvent<HTMLElement>) => void
>;

type DancerDotProps = { dancer: StageDancer; selected: boolean; hit: DotHit | undefined };

function DancerDot({ dancer, selected, hit }: DancerDotProps) {
  const spot = {
    left: `${((dancer.x * STAGE_WIDTH_M + sideWing) / planWidth) * 100}%`,
    top: `${((dancer.y * STAGE_DEPTH_M + upstageWing) / planHeight) * 100}%`,
    '--dot': dancer.color === null ? 'var(--stage-line)' : dancerColorVar(dancer.color),
  } as CSSProperties;
  const classes = [
    styles.dancer,
    isOffStage(dancer) && styles.offStage,
    dancer.open && styles.open,
    selected && styles.selected,
  ];
  return (
    <div className={classes.filter(Boolean).join(' ')} style={spot} data-testid="dancer">
      {hit && <span className={styles.hit} data-testid="dancer-hit" {...hit} />}
      <span className={styles.dot} />
      <span className={styles.label}>{dancer.label}</span>
      {dancer.role && <span className={styles.role}>{dancer.role}</span>}
    </div>
  );
}
