import type { Dance, FigureCopy } from '@living-stage/shared';
import { type CSSProperties, lazy, Suspense, useState } from 'react';
import { updateDance } from '../api/dances.ts';
import { CastList } from '../cast/CastList.tsx';
import { stageDancers } from '../cast/stage-dancers.ts';
import { useCast } from '../cast/useCast.ts';
import { FigurePanel } from '../figures/FigurePanel.tsx';
import { FigureStrip } from '../figures/FigureStrip.tsx';
import { FigureToolbar } from '../figures/FigureToolbar.tsx';
import { STAGE_PLAN_ASPECT, Stage } from '../stage/Stage.tsx';
import { Button } from '../ui/Button.tsx';
import { SegmentedControl } from '../ui/SegmentedControl.tsx';
import styles from './DanceEditor.module.css';

// Three.js is only downloaded once a 3D stage is shown.
const Stage3D = lazy(() =>
  import('../stage/Stage3D.tsx').then(({ Stage3D }) => ({ default: Stage3D })),
);

const stageFit = { '--plan-aspect': STAGE_PLAN_ASPECT } as CSSProperties;

const stageViewOptions = [
  { value: '2d', label: '2D plan' },
  { value: '3d', label: '3D stage' },
] as const;

type StageViewMode = (typeof stageViewOptions)[number]['value'];

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
  const [stageView, setStageView] = useState<StageViewMode>('3d');
  const figures = cast.status === 'ready' ? cast.figures : [];
  const figure = figures.find(({ id }) => id === selectedFigureId) ?? figures[0];
  const dancers =
    cast.status === 'ready' && figure ? stageDancers(cast.cast, figure.positions, dance) : [];

  // Tapping the selected figure again opens its panel. The id is kept even then, since
  // the first figure is only selected by default and may be moved away from first place.
  function selectFigure(figureId: string) {
    if (figureId === figure?.id) setFigurePanelOpen(true);
    setSelectedFigureId(figureId);
  }

  async function copyFigure(placement: FigureCopy['placement']) {
    if (!figure) return;
    const copy = await castActions.copyFigure({ copyOf: figure.id, placement });
    setSelectedFigureId(copy.id);
  }

  // The figure before the deleted one is selected next, or the new first figure.
  async function deleteFigure(figureId: string) {
    const index = figures.findIndex(({ id }) => id === figureId);
    const next = figures[index - 1] ?? figures[index + 1];
    await castActions.deleteFigure(figureId);
    setSelectedFigureId(next?.id ?? null);
    setFigurePanelOpen(false);
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
            <SegmentedControl
              label="Stage view"
              options={stageViewOptions}
              value={stageView}
              onChange={setStageView}
            />
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
            {stageView === '3d' ? (
              <Suspense fallback={<div className={styles.stageLoading} />}>
                <Stage3D showGuides={dance.showGuides} dancers={dancers} />
              </Suspense>
            ) : (
              <div className={styles.stageFit}>
                <Stage showGuides={dance.showGuides} dancers={dancers} />
              </div>
            )}
          </div>
          {figure && (
            <FigureStrip
              figures={figures}
              selectedId={figure.id}
              onSelect={selectFigure}
              onReorder={castActions.reorderFigures}
            />
          )}
        </main>
        {figurePanelOpen && figure ? (
          <FigurePanel
            key={figure.id}
            figure={figure}
            figures={figures}
            actions={{
              rename: (name) => castActions.renameFigure(figure.id, name),
              remove: () => deleteFigure(figure.id),
            }}
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
