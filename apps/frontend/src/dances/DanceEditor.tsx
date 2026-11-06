import {
  stageAt,
  type Dance,
  type FigureCopy,
  type Path,
  type PathPoint,
  type Position,
} from '@living-stage/shared';
import { type CSSProperties, useEffect, useState } from 'react';
import { updateDance } from '../api/dances.ts';
import { CastList } from '../cast/CastList.tsx';
import { stageDancers } from '../cast/stage-dancers.ts';
import { useCast } from '../cast/useCast.ts';
import { FigurePanel } from '../figures/FigurePanel.tsx';
import { FigureStrip } from '../figures/FigureStrip.tsx';
import { FigureToolbar } from '../figures/FigureToolbar.tsx';
import { CirclingRow } from '../paths/CirclingRow.tsx';
import circlingStyles from '../paths/CirclingRow.module.css';
import { useCircling } from '../paths/useCircling.ts';
import { Transport } from '../playback/Transport.tsx';
import { enterFullScreen } from '../presentation/full-screen.ts';
import { PresentationMode } from '../presentation/PresentationMode.tsx';
import { usePlayback } from '../playback/usePlayback.ts';
import { STAGE_PLAN_ASPECT, Stage } from '../stage/Stage.tsx';
import { selectedPaths } from '../stage/selected-paths.ts';
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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [snap, setSnap] = useState(false);
  const [presenting, setPresenting] = useState(false);
  // Snapping is only on while guides are shown, since nobody can aim at hidden lines.
  const snapping = snap && dance.showGuides;
  const castIds = cast.status === 'ready' ? cast.cast.map(({ id }) => id) : [];
  // The whole selection goes once one of its dancers leaves the cast.
  const selection = selectedIds.every((id) => castIds.includes(id)) ? selectedIds : [];
  const figures = cast.status === 'ready' ? cast.figures : [];
  const figure = figures.find(({ id }) => id === selectedFigureId) ?? figures[0];
  const playback = usePlayback({
    figures,
    selectedIndex: figure ? figures.indexOf(figure) : 0,
    onFinish: setSelectedFigureId,
  });
  // Editing is only on while playback is stopped at a figure.
  const stopped = playback.status === 'stopped';
  const moment = stopped ? null : stageAt(figures, playback.timeMs);
  const positions = moment?.positions ?? figure?.positions;
  const dancers =
    cast.status === 'ready' && positions ? stageDancers(cast.cast, positions, dance) : [];
  const paths = stopped && figure ? selectedPaths(figures, figure, selection) : [];
  const circling = useCircling({
    figures,
    figure,
    selection,
    stopped,
    cast: cast.status === 'ready' ? cast.cast : [],
    save: savePath,
  });
  const { picking, cancel: cancelPicking } = circling;

  // Escape first stops picking a dancer to circle, then clears the selection.
  useEffect(() => {
    if (selection.length === 0 || presenting) return;
    function onEscape(event: KeyboardEvent) {
      if (event.key !== 'Escape') return;
      if (picking) cancelPicking();
      else setSelectedIds([]);
    }
    document.addEventListener('keydown', onEscape);
    return () => document.removeEventListener('keydown', onEscape);
  }, [selection.length, picking, cancelPicking, presenting]);

  // A failed save puts the dancers back, which is the only feedback needed.
  function moveDancers(positions: Position[]) {
    if (!figure) return;
    castActions.movePositions(figure.id, positions).catch(() => {});
  }

  // Like moving dancers, a failed save puts the path back.
  function savePath(path: Path) {
    if (!figure) return;
    castActions.setPath(figure.id, path).catch(() => {});
  }

  const bendPath = (castMemberId: string, points: PathPoint[]) =>
    savePath({ castMemberId, points, around: null });

  // Tapping the selected figure again opens its panel. The id is kept even then, since
  // the first figure is only selected by default and may be moved away from first place.
  function selectFigure(figureId: string) {
    if (stopped && figureId === figure?.id) setFigurePanelOpen(true);
    playback.stop();
    setSelectedFigureId(figureId);
  }

  async function copyFigure(placement: FigureCopy['placement']) {
    if (!figure) return;
    playback.stop();
    const copy = await castActions.copyFigure({ copyOf: figure.id, placement });
    setSelectedFigureId(copy.id);
  }

  // The figure before the deleted one is selected next, or the new first figure.
  async function deleteFigure(figureId: string) {
    const index = figures.findIndex(({ id }) => id === figureId);
    const next = figures[index - 1] ?? figures[index + 1];
    playback.stop();
    await castActions.deleteFigure(figureId);
    setSelectedFigureId(next?.id ?? null);
    setFigurePanelOpen(false);
  }

  function reorderFigures(figureIds: string[]) {
    playback.stop();
    return castActions.reorderFigures(figureIds);
  }

  function present() {
    playback.stop();
    cancelPicking();
    enterFullScreen();
    setPresenting(true);
  }

  function leavePresentation(figureId: string) {
    setSelectedFigureId(figureId);
    setPresenting(false);
  }

  // Shown right away; put back if saving fails.
  function saveView<K extends ViewSetting>(setting: K, value: Dance[K]) {
    const previous = dance[setting];
    setDance({ ...dance, [setting]: value });
    updateDance(schoolId, dance.id, { [setting]: value }).catch(() =>
      setDance((current) => ({ ...current, [setting]: previous })),
    );
  }

  if (presenting && cast.status === 'ready' && figure) {
    return (
      <PresentationMode
        presented={{ dance, cast: cast.cast, figures }}
        startFigureId={figure.id}
        onLeave={leavePresentation}
      />
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
            <button
              type="button"
              className={styles.toggle}
              aria-pressed={snapping}
              disabled={!dance.showGuides}
              onClick={() => setSnap(!snap)}
            >
              Snap
            </button>
          </div>
          <FigureToolbar
            disabled={!figure}
            actions={{ copy: copyFigure, present }}
            circle={circling.tool}
          />
          {picking && (
            <p role="status" className={circlingStyles.hint}>
              Tap the dancer to circle around
            </p>
          )}
          {circling.row && <CirclingRow {...circling.row} />}
          <div className={styles.stageArea} style={stageFit}>
            <div className={styles.stageFit}>
              <Stage
                showGuides={dance.showGuides}
                dancers={dancers}
                paths={paths}
                edit={
                  stopped
                    ? {
                        selectedIds: selection,
                        snap: snapping,
                        onSelect: setSelectedIds,
                        onMove: moveDancers,
                        onBend: bendPath,
                        ...(picking && { onPick: circling.pick }),
                      }
                    : undefined
                }
              />
            </div>
          </div>
          {figure && (
            <section className={styles.timeline} aria-label="Timeline">
              <Transport playback={playback} />
              <FigureStrip
                figures={figures}
                active={{ id: moment?.to.id ?? figure.id, editable: stopped }}
                onSelect={selectFigure}
                onReorder={reorderFigures}
              />
            </section>
          )}
        </main>
        {figurePanelOpen && figure ? (
          <FigurePanel
            key={figure.id}
            figure={figure}
            figures={figures}
            actions={{
              save: (update) => castActions.saveFigure(figure.id, update),
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
