import {
  PLAN_BOUNDS,
  SIDE_WING_DEPTH,
  STAGE_CENTER,
  STAGE_DEPTH_M,
  STAGE_QUARTERS,
  STAGE_WIDTH_M,
  UPSTAGE_WING_DEPTH,
  type DancerColor,
} from '@living-stage/shared';
import { type CSSProperties, useRef } from 'react';
import { dancerColorVar } from '../dancers/dancer-colors.ts';
import styles from './Stage.module.css';
import {
  type DancerHandlers,
  type SelectionBox,
  type StageEditing,
  usePlanGestures,
} from './usePlanGestures.ts';

export type { StageEditing } from './usePlanGestures.ts';

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
  const { shown, box, floor, dancerHandlers } = usePlanGestures({ dancers, edit, planRef });

  return (
    <div
      className={styles.stage}
      style={geometry}
      // An image hides its contents from screen readers, so the editable plan is a group of buttons.
      role={edit ? 'group' : 'img'}
      aria-label="Stage seen from above, audience at the bottom"
    >
      <div
        ref={planRef}
        className={edit ? `${styles.plan} ${styles.editable}` : styles.plan}
        {...(edit && floor)}
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
            handlers={edit && dancerHandlers(dancer)}
          />
        ))}
        {box && <Box box={box} />}
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

const percentX = (x: number) =>
  ((x - PLAN_BOUNDS.minX) / (PLAN_BOUNDS.maxX - PLAN_BOUNDS.minX)) * 100;
const percentY = (y: number) =>
  ((y - PLAN_BOUNDS.minY) / (PLAN_BOUNDS.maxY - PLAN_BOUNDS.minY)) * 100;

function Box({ box }: { box: SelectionBox }) {
  const area = {
    left: `${percentX(box.left)}%`,
    top: `${percentY(box.top)}%`,
    width: `${percentX(box.right) - percentX(box.left)}%`,
    height: `${percentY(box.bottom) - percentY(box.top)}%`,
  };
  return <div className={styles.box} style={area} data-testid="selection-box" />;
}

type DancerDotProps = {
  dancer: StageDancer;
  selected: boolean;
  handlers: DancerHandlers | undefined;
};

function DancerDot({ dancer, selected, handlers }: DancerDotProps) {
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
      {handlers && (
        <button
          type="button"
          className={styles.hit}
          aria-label={dancer.role ? `${dancer.label}, ${dancer.role}` : dancer.label}
          aria-pressed={selected}
          data-testid="dancer-hit"
          {...handlers}
        />
      )}
      <span className={styles.dot} />
      <span className={styles.label}>{dancer.label}</span>
      {dancer.role && <span className={styles.role}>{dancer.role}</span>}
    </div>
  );
}
