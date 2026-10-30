import type { Dance, FigureCopy } from '@living-stage/shared';
import { type CSSProperties, useState } from 'react';
import { updateDance } from '../api/dances.ts';
import { CastList } from '../cast/CastList.tsx';
import { stageDancers } from '../cast/stage-dancers.ts';
import { useCast } from '../cast/useCast.ts';
import { figureLabel } from '../figures/figure-label.ts';
import { FigurePanel } from '../figures/FigurePanel.tsx';
import { FigureStrip } from '../figures/FigureStrip.tsx';
import { FigureToolbar } from '../figures/FigureToolbar.tsx';
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

const colorOptions = [
  { value: 'dancer', label: 'Dancer' },
  { value: 'role', label: 'Role' },
] as const;

type ViewSetting = 'showGuides' | 'labelMode' | 'colorMode';

type DanceEditorProps = { schoolId: string; dance: Dance; onBack: () => void };

export function DanceEditor({ schoolId, dance: opened, onBack }: DanceEditorProps) {
  const [dance, setDance] = useState(opened);
  const { state: cast, ...castActions } = useCast(schoolId, opened.id);
  const [selectedFigureId, setSelectedFigureId] = useState<string | null>(null);
  const [figurePanelOpen, setFigurePanelOpen] = useState(false);
  const figures = cast.status === 'ready' ? cast.figures : [];
  const figure = figures.find(({ id }) => id === selectedFigureId) ?? figures[0];
  const dancers =
    cast.status === 'ready' && figure ? stageDancers(cast.cast, figure.positions, dance) : [];

  // Tapping the selected figure again opens its panel.
  function selectFigure(figureId: string) {
    if (figureId === figure?.id) setFigurePanelOpen(true);
    else setSelectedFigureId(figureId);
  }

  async function copyFigure(placement: FigureCopy['placement']) {
    if (!figure) return;
    const copy = await castActions.copyFigure({ copyOf: figure.id, placement });
    setSelectedFigureId(copy.id);
  }

  // Shown right away; put back if saving fails.
  function saveView<K extends ViewSetting>(setting: K, value: Dance[K]) {
    const previous = dance[setting];
    setDance({ ...dance, [setting]: value });
    updateDance(schoolId, dance.id, { [setting]: value }).catch(() =>
      setDance((current) => ({ ...current, [setting]: previous })),
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
          <div className={styles.viewControls}>
            <span className={styles.controlLabel} aria-hidden="true">
              Labels
            </span>
            <SegmentedControl
              label="Labels"
              options={labelOptions}
              value={dance.labelMode}
              onChange={(labelMode) => saveView('labelMode', labelMode)}
            />
            <span className={styles.controlLabel} aria-hidden="true">
              Color by
            </span>
            <SegmentedControl
              label="Color by"
              options={colorOptions}
              value={dance.colorMode}
              onChange={(colorMode) => saveView('colorMode', colorMode)}
            />
            <button
              type="button"
              className={styles.toggle}
              aria-pressed={dance.showGuides}
              onClick={() => saveView('showGuides', !dance.showGuides)}
            >
              Guides
            </button>
          </div>
          <FigureToolbar disabled={!figure} onCopy={copyFigure} />
          <div className={styles.stageArea} style={stageFit}>
            <div className={styles.stageFit}>
              <Stage showGuides={dance.showGuides} dancers={dancers} />
            </div>
          </div>
          {figure && (
            <FigureStrip figures={figures} selectedId={figure.id} onSelect={selectFigure} />
          )}
        </main>
        {figurePanelOpen && figure ? (
          <FigurePanel
            key={figure.id}
            figure={figure}
            label={figureLabel(figure, figures.indexOf(figure))}
            onRename={(name) => castActions.renameFigure(figure.id, name)}
            onClose={() => setFigurePanelOpen(false)}
          />
        ) : (
          <CastList
            schoolId={schoolId}
            state={cast}
            actions={castActions}
            colorMode={dance.colorMode}
          />
        )}
      </div>
    </div>
  );
}
