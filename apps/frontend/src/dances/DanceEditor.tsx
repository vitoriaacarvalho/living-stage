import type { Dance } from '@living-stage/shared';
import { type CSSProperties, useState } from 'react';
import { updateDance } from '../api/dances.ts';
import { CastList } from '../cast/CastList.tsx';
import { stageDancers } from '../cast/stage-dancers.ts';
import { useCast } from '../cast/useCast.ts';
import { STAGE_PLAN_ASPECT, Stage } from '../stage/Stage.tsx';
import { Button } from '../ui/Button.tsx';
import styles from './DanceEditor.module.css';

const stageFit = { '--plan-aspect': STAGE_PLAN_ASPECT } as CSSProperties;

type DanceEditorProps = { schoolId: string; dance: Dance; onBack: () => void };

export function DanceEditor({ schoolId, dance: opened, onBack }: DanceEditorProps) {
  const [dance, setDance] = useState(opened);
  const { state: cast, ...castActions } = useCast(schoolId, opened.id);
  const dancers = cast.status === 'ready' ? stageDancers(cast.cast, cast.positions) : [];

  function toggleGuides() {
    const showGuides = !dance.showGuides;
    setDance({ ...dance, showGuides });
    updateDance(schoolId, dance.id, { showGuides }).catch(() =>
      setDance((current) => ({ ...current, showGuides: !showGuides })),
    );
  }

  return (
    <div className={styles.editor}>
      <header className={styles.appBar}>
        <Button variant="ghost" icon="back" aria-label="Back to dances" onClick={onBack} />
        <h1 className={styles.title}>{dance.title}</h1>
      </header>
      <div className={styles.body}>
        <main className={styles.main}>
          <div className={styles.stageArea} style={stageFit}>
            <div className={styles.stageFit}>
              <Stage showGuides={dance.showGuides} dancers={dancers} />
              <div className={styles.stageControls}>
                <button
                  type="button"
                  className={styles.stageToggle}
                  aria-pressed={dance.showGuides}
                  onClick={toggleGuides}
                >
                  Guides
                </button>
              </div>
            </div>
          </div>
        </main>
        <CastList schoolId={schoolId} state={cast} actions={castActions} />
      </div>
    </div>
  );
}
