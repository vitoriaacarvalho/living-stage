import type { Figure } from '@living-stage/shared';
import { Icon } from '../ui/Icon.tsx';
import { figureLabel } from './figure-label.ts';
import styles from './FigureStrip.module.css';

type FigureStripProps = {
  figures: Figure[];
  selectedId: string;
  onSelect: (figureId: string) => void;
};

export function FigureStrip({ figures, selectedId, onSelect }: FigureStripProps) {
  return (
    <ol className={styles.strip} aria-label="Figures">
      {figures.map((figure, index) => (
        <li key={figure.id}>
          <button
            type="button"
            className={styles.chip}
            aria-current={figure.id === selectedId ? 'true' : undefined}
            onClick={() => onSelect(figure.id)}
          >
            {figureLabel(figure, index)}
            {figure.id === selectedId && <Icon name="pencil" />}
          </button>
        </li>
      ))}
    </ol>
  );
}
