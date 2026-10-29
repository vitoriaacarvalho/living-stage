import type { Dance, LabelMode } from '@living-stage/shared';
import { type CSSProperties, useState } from 'react';
import { updateDance } from '../api/dances.ts';
import { CastList } from '../cast/CastList.tsx';
import { stageDancers } from '../cast/stage-dancers.ts';
import { useCast } from '../cast/useCast.ts';
import { STAGE_PLAN_ASPECT, Stage } from '../stage/Stage.tsx';
import { Button } from '../ui/Button.tsx';
import { SegmentedControl } from '../ui/SegmentedControl.tsx';
import styles from './DanceEditor.module.css';

const stageFit = { '--plan-aspect': STAGE_PLAN_ASPECT } as CSSProperties;

const labelOptions = [
  { value: 'name', label: 'Name' },
  { value: 'role', label: 'Role' },
  { value: 'both', label: 'Both' },
] as const;

type DanceEditorProps = { schoolId: string; dance: Dance; onBack: () => void };

export function DanceEditor({ schoolId, dance: opened, onBack }: DanceEditorProps) {
  const [dance, setDance] = useState(opened);
  const { state: cast, ...castActions } = useCast(schoolId, opened.id);
  const dancers =
    cast.status === 'ready' ? stageDancers(cast.cast, cast.positions, dance.labelMode) : [];

  function toggleGuides() {
    const showGuides = !dance.showGuides;
    setDance({ ...dance, showGuides });
    updateDance(schoolId, dance.id, { showGuides }).catch(() =>
      setDance((current) => ({ ...current, showGuides: !showGuides })),
    );
  }

  function changeLabelMode(labelMode: LabelMode) {
    const previous = dance.labelMode;
    setDance({ ...dance, labelMode });
    updateDance(schoolId, dance.id, { labelMode }).catch(() =>
      setDance((current) => ({ ...current, labelMode: previous })),
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
                <SegmentedControl
                  label="Labels"
                  options={labelOptions}
                  value={dance.labelMode}
                  onChange={changeLabelMode}
                  surface="stage"
                />
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
