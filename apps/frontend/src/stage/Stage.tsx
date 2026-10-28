import {
  SIDE_WING_DEPTH,
  STAGE_CENTER,
  STAGE_DEPTH_M,
  STAGE_QUARTERS,
  STAGE_WIDTH_M,
  UPSTAGE_WING_DEPTH,
} from '@living-stage/shared';
import type { CSSProperties } from 'react';
import styles from './Stage.module.css';

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

export function Stage({ showGuides }: { showGuides: boolean }) {
  return (
    <div
      className={styles.stage}
      style={geometry}
      role="img"
      aria-label="Stage seen from above, audience at the bottom"
    >
      <div className={styles.plan}>
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
