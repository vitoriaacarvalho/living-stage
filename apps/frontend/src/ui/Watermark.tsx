import { sketches, type Sketch } from './sketches.ts';
import styles from './Watermark.module.css';

type Placement = {
  sketch: Sketch;
  left: string;
  top: string;
  width: string;
  turn: number;
  mirror?: boolean;
};

const layouts = {
  page: [
    { sketch: 'cambre', left: '-8%', top: '-4%', width: '38%', turn: -3 },
    { sketch: 'arabesque', left: '66%', top: '-8%', width: '30%', turn: 4 },
    { sketch: 'reverence', left: '22%', top: '60%', width: '46%', turn: 2 },
    { sketch: 'pointe', left: '80%', top: '58%', width: '20%', turn: -6 },
  ],
  quiet: [
    { sketch: 'arabesque', left: '-2%', top: '42%', width: '22%', turn: -4 },
    { sketch: 'cambre', left: '60%', top: '62%', width: '42%', turn: 3, mirror: true },
  ],
  form: [
    { sketch: 'arabesque', left: '64%', top: '-4%', width: '40%', turn: 5 },
    { sketch: 'cambre', left: '-6%', top: '62%', width: '46%', turn: -3 },
    { sketch: 'reverence', left: '52%', top: '70%', width: '44%', turn: 2 },
  ],
} satisfies Record<string, Placement[]>;

export type WatermarkLayout = keyof typeof layouts;

// The parent needs position: relative, and its content sits above with z-index 1.
export function Watermark({ layout }: { layout: WatermarkLayout }) {
  const placements: Placement[] = layouts[layout];

  return (
    <div className={styles.watermark} aria-hidden="true">
      {placements.map(({ sketch, left, top, width, turn, mirror }) => (
        <img
          key={sketch}
          className={styles.sketch}
          src={sketches[sketch]}
          alt=""
          decoding="async"
          style={{ left, top, width, transform: `rotate(${turn}deg)${mirror ? ' scaleX(-1)' : ''}` }}
        />
      ))}
    </div>
  );
}
