import {
  STAGE_CENTER,
  STAGE_DEPTH_M,
  STAGE_QUARTERS,
  STAGE_WIDTH_M,
  type DancePreviewSpot,
} from '@living-stage/shared';
import { dancerColorVar } from '../dancers/dancer-colors.ts';
import { PLAN_VIEW_BOX } from './Stage.tsx';
import styles from './StageThumbnail.module.css';

const guides = [STAGE_QUARTERS[0], STAGE_CENTER, STAGE_QUARTERS[1]];

// A small picture of a figure for cards: no labels, so it stays decorative.
export function StageThumbnail({ spots }: { spots: DancePreviewSpot[] }) {
  return (
    <svg className={styles.thumbnail} viewBox={PLAN_VIEW_BOX} aria-hidden="true">
      <rect className={styles.floor} width={STAGE_WIDTH_M} height={STAGE_DEPTH_M} />
      {guides.map((at) => (
        <g key={at} className={styles.guide}>
          <line x1={at * STAGE_WIDTH_M} y1={0} x2={at * STAGE_WIDTH_M} y2={STAGE_DEPTH_M} />
          <line x1={0} y1={at * STAGE_DEPTH_M} x2={STAGE_WIDTH_M} y2={at * STAGE_DEPTH_M} />
        </g>
      ))}
      <line
        className={styles.edge}
        x1={0}
        y1={STAGE_DEPTH_M}
        x2={STAGE_WIDTH_M}
        y2={STAGE_DEPTH_M}
      />
      {spots.map(({ x, y, color, open }, index) => (
        <circle
          key={index}
          className={open ? `${styles.dot} ${styles.open}` : styles.dot}
          cx={x * STAGE_WIDTH_M}
          cy={y * STAGE_DEPTH_M}
          r={0.3}
          style={{ fill: color === null ? undefined : dancerColorVar(color) }}
          data-testid="thumbnail-dot"
        />
      ))}
    </svg>
  );
}
