import type { Dance } from '@living-stage/shared';
import type { CSSProperties } from 'react';
import { STAGE_PLAN_ASPECT, Stage } from '../stage/Stage.tsx';
import { Button } from '../ui/Button.tsx';
import styles from './DanceEditor.module.css';

const stageFit = { '--plan-aspect': STAGE_PLAN_ASPECT } as CSSProperties;

type DanceEditorProps = { dance: Dance; onBack: () => void };

export function DanceEditor({ dance, onBack }: DanceEditorProps) {
  return (
    <div className={styles.editor}>
      <header className={styles.appBar}>
        <Button variant="ghost" icon="back" aria-label="Back to dances" onClick={onBack} />
        <h1 className={styles.title}>{dance.title}</h1>
      </header>
      <main className={styles.main}>
        <div className={styles.stageArea} style={stageFit}>
          <div className={styles.stageFit}>
            <Stage showGuides={dance.showGuides} />
          </div>
        </div>
      </main>
    </div>
  );
}
