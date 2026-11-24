import {
  isPinned,
  pinRange,
  songTimed,
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
import { MusicPanel } from '../music/MusicPanel.tsx';
import { useSong } from '../music/useSong.ts';
import { useSongs } from '../music/useSongs.ts';
import { Waveform } from '../music/Waveform.tsx';
import { FigureStrip } from '../figures/FigureStrip.tsx';
import { FigureToolbar } from '../figures/FigureToolbar.tsx';
import { CirclingRow } from '../paths/CirclingRow.tsx';
import circlingStyles from '../paths/CirclingRow.module.css';
import { useCircling } from '../paths/useCircling.ts';
import { Transport } from '../playback/Transport.tsx';
import { enterFullScreen } from '../presentation/full-screen.ts';
import { PresentationMode } from '../presentation/PresentationMode.tsx';
import { usePlayback } from '../playback/usePlayback.ts';
import { SongControls } from '../playback/SongControls.tsx';
import { useSongPlayback } from '../playback/useSongPlayback.ts';
import { STAGE_PLAN_ASPECT, Stage } from '../stage/Stage.tsx';
import { selectedPaths } from '../stage/selected-paths.ts';
import { BottomSheet } from '../ui/BottomSheet.tsx';
import { useUndoableEdits } from '../undo/useUndoableEdits.ts';
import { useUndoKeys } from '../undo/useUndoKeys.ts';
import { Button } from '../ui/Button.tsx';
import { Icon } from '../ui/Icon.tsx';
import { SegmentedControl } from '../ui/SegmentedControl.tsx';
import { usePhone } from '../ui/usePhone.ts';
import styles from './DanceEditor.module.css';
import { LandscapeHint } from './LandscapeHint.tsx';

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

const sheetLabels = { cast: 'Cast', figure: 'Figure', music: 'Music' } as const;

type DanceEditorProps = { schoolId: string; dance: Dance; onBack: () => void };

export function DanceEditor({ schoolId, dance: opened, onBack }: DanceEditorProps) {
  const [dance, setDance] = useState(opened);
  const { state: cast, ...castActions } = useCast(schoolId, opened.id);
  const [selectedFigureId, setSelectedFigureId] = useState<string | null>(null);
  // What the sidebar (the bottom sheet on a phone) shows: the cast unless a panel is open.
  const [panelView, setPanelView] = useState<'cast' | 'figure' | 'music'>('cast');
  const songs = useSongs(schoolId);
  const songWithWaveform = useSong(schoolId, dance.audioId);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [snap, setSnap] = useState(false);
  const [presenting, setPresenting] = useState(false);
  const phone = usePhone();
  const castIds = cast.status === 'ready' ? cast.cast.map(({ id }) => id) : [];
  // The whole selection goes once one of its dancers leaves the cast.
  const selection = selectedIds.every((id) => castIds.includes(id)) ? selectedIds : [];
  const figures = cast.status === 'ready' ? cast.figures : [];
  const figure = figures.find(({ id }) => id === selectedFigureId) ?? figures[0];
  const selectedIndex = figure ? figures.indexOf(figure) : 0;
  const movesPlayback = usePlayback({ figures, selectedIndex, onFinish: setSelectedFigureId });
  const [audio] = useState(() => new Audio());
  const songPlayback = useSongPlayback(
    audio,
    {
      figures,
      selectedIndex,
      songMs: songWithWaveform?.durationMs ?? 0,
      url: songWithWaveform?.url ?? null,
    },
    setSelectedFigureId,
  );
  // With a song and every figure pinned, the song is the clock; otherwise the move times are.
  const onSong = songWithWaveform !== null && isPinned(figures);
  const playback = onSong ? songPlayback : movesPlayback;
  const timed = onSong ? songTimed(figures) : figures;
  const startMs = onSong ? (figures[0]?.timeMs ?? 0) : 0;
  // Editing is only on while playback is stopped at a figure.
  const stopped = playback.status === 'stopped';
  const moment = stopped ? null : stageAt(timed, playback.timeMs - startMs);
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
  const edits = useUndoableEdits(castActions);
  // Like editing, undo and redo work only while playback is stopped, on the figure shown.
  const undoable = stopped && !presenting && figure ? figure.id : null;
  const history = {
    undo: undoable && edits.canUndo(undoable) ? () => edits.undo(undoable) : null,
    redo: undoable && edits.canRedo(undoable) ? () => edits.redo(undoable) : null,
  };
  useUndoKeys(history);

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
    edits.movePositions(figure, positions).catch(() => {});
  }

  // Like moving dancers, a failed save puts the path back.
  function savePath(path: Path) {
    if (!figure) return;
    edits.setPath(figure, path).catch(() => {});
  }

  const bendPath = (castMemberId: string, points: PathPoint[]) =>
    savePath({ castMemberId, points, around: null });

  // Tapping the selected figure again opens its panel. The id is kept even then, since
  // the first figure is only selected by default and may be moved away from first place.
  function selectFigure(figureId: string) {
    if (stopped && figureId === figure?.id) setPanelView('figure');
    playback.stop();
    setSelectedFigureId(figureId);
  }

  async function copyFigure(placement: FigureCopy['placement']) {
    if (!figure) return;
    playback.stop();
    const copy = await castActions.copyFigure({ copyOf: figure.id, placement });
    // A new last figure past the song's end squeezes the other pins on the server.
    if (onSong) await castActions.reloadFigures();
    setSelectedFigureId(copy.id);
  }

  // The figure before the deleted one is selected next, or the new first figure.
  async function deleteFigure(figureId: string) {
    const index = figures.findIndex(({ id }) => id === figureId);
    const next = figures[index - 1] ?? figures[index + 1];
    playback.stop();
    await castActions.deleteFigure(figureId);
    setSelectedFigureId(next?.id ?? null);
    setPanelView('cast');
  }

  // Older steps may hold the removed dancer, whom the server no longer knows.
  async function removeFromCast(castMemberId: string) {
    await castActions.remove(castMemberId);
    edits.clear();
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

  // A dragged marker lands as near as it may: between its neighbours, inside the song.
  function moveFigureTo(figureId: string, timeMs: number) {
    const index = figures.findIndex(({ id }) => id === figureId);
    const pins = figures.map(({ timeMs: pin }) => pin ?? 0);
    const { minMs, maxMs } = pinRange(pins, index, songWithWaveform?.durationMs ?? 0);
    const landed = Math.min(maxMs, Math.max(minMs, timeMs));
    edits.saveFigure(figures[index]!, { timeMs: landed }).catch(() => {});
  }

  async function chooseSong(audioId: string | null) {
    playback.stop();
    const updated = await updateDance(schoolId, dance.id, { audioId });
    setDance((current) => ({ ...current, audioId: updated.audioId }));
    // The server pins the figures to the new song.
    if (audioId) await castActions.reloadFigures();
  }

  const song =
    songs.state.status === 'ready'
      ? (songs.state.songs.find(({ id }) => id === dance.audioId) ?? null)
      : null;

  if (presenting && cast.status === 'ready' && figure) {
    return (
      <PresentationMode
        presented={{
          dance,
          cast: cast.cast,
          figures,
          music: onSong ? { audio, songMs: songWithWaveform.durationMs } : null,
        }}
        startFigureId={figure.id}
        onLeave={leavePresentation}
      />
    );
  }
  // The sidebar on iPad and desktop, the bottom sheet on a phone.
  const showing = panelView === 'figure' && !figure ? 'cast' : panelView;
  const panel =
    showing === 'figure' && figure ? (
      <FigurePanel
        // Undo can change the figure under an open panel; its fields start over then.
        key={`${figure.id}:${figure.name}:${figure.transitionMs}:${figure.timeMs}`}
        figure={figure}
        dance={{ figures, songMs: onSong ? (songWithWaveform?.durationMs ?? null) : null }}
        actions={{
          save: (update) => edits.saveFigure(figure, update),
          remove: () => deleteFigure(figure.id),
        }}
        onClose={() => setPanelView('cast')}
      />
    ) : showing === 'music' ? (
      <MusicPanel
        library={songs}
        choice={{ audioId: dance.audioId, choose: chooseSong }}
        onClose={() => setPanelView('cast')}
      />
    ) : (
      <CastList
        schoolId={schoolId}
        state={cast}
        actions={{ ...castActions, remove: removeFromCast }}
        colorMode={dance.colorMode}
      />
    );

  // In phone landscape the sheet sits in the editor's right-hand column, inside main.
  const side = phone ? <BottomSheet label={sheetLabels[showing]}>{panel}</BottomSheet> : panel;

  return (
    <div className={styles.editor}>
      <header className={styles.appBar}>
        <Button variant="ghost" icon="back" aria-label="Back to dances" onClick={onBack} />
        {phone ? (
          <>
            <div className={styles.phoneTitle}>
              <h1 className={styles.title}>{dance.title}</h1>
              {figure && (
                <p className={styles.figureCount}>
                  Figure {figures.indexOf(figure) + 1} of {figures.length}
                </p>
              )}
            </div>
            <Button
              variant="ghost"
              icon="present"
              aria-label="Present"
              disabled={!figure}
              onClick={present}
            />
          </>
        ) : (
          <h1 className={styles.title}>{dance.title}</h1>
        )}
      </header>
      {phone === 'portrait' && <LandscapeHint />}
      <div className={styles.body}>
        <main className={styles.main}>
          <div className={styles.viewControls}>
            <div className={styles.controlGroup}>
              <span className={styles.controlLabel} aria-hidden="true">
                Labels
              </span>
              <SegmentedControl
                label="Labels"
                options={labelOptions}
                value={dance.labelMode}
                surface="tinted"
                onChange={(labelMode) => saveView('labelMode', labelMode)}
              />
            </div>
            <div className={styles.controlGroup}>
              <span className={styles.controlLabel} aria-hidden="true">
                Color by
              </span>
              <SegmentedControl
                label="Color by"
                options={colorOptions}
                value={dance.colorMode}
                surface="tinted"
                onChange={(colorMode) => saveView('colorMode', colorMode)}
              />
            </div>
            <div className={styles.controlGroup}>
              <button
                type="button"
                className={styles.toggle}
                aria-label="Guides"
                aria-pressed={dance.showGuides}
                onClick={() => saveView('showGuides', !dance.showGuides)}
              >
                <Icon name="grid" />
                <span className={styles.toggleText} aria-hidden="true">
                  Guides
                </span>
              </button>
              <button
                type="button"
                className={styles.toggle}
                aria-label="Snap"
                aria-pressed={snap}
                onClick={() => setSnap(!snap)}
              >
                <Icon name="magnet" />
                <span className={styles.toggleText} aria-hidden="true">
                  Snap
                </span>
              </button>
            </div>
          </div>
          <div className={styles.tools}>
            <FigureToolbar
              disabled={!figure}
              actions={{ copy: copyFigure, ...history, ...(!phone && { present }) }}
              circle={circling.tool}
            />
            {picking && (
              <p role="status" className={circlingStyles.hint}>
                Tap the dancer to circle around
              </p>
            )}
            {circling.row && <CirclingRow {...circling.row} />}
          </div>
          <div className={styles.stageArea} style={stageFit}>
            <div className={styles.stageFit}>
              <Stage
                guides={dance.showGuides ? 'grid' : 'none'}
                dancers={dancers}
                paths={paths}
                edit={
                  stopped
                    ? {
                        selectedIds: selection,
                        snap,
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
              <div className={styles.transportRow}>
                <Transport playback={playback} />
                {onSong && <SongControls playback={songPlayback} />}
                <Button
                  variant="secondary"
                  className={styles.music}
                  aria-label={song ? `Music: ${song.name}` : undefined}
                  aria-pressed={showing === 'music'}
                  onClick={() => setPanelView(showing === 'music' ? 'cast' : 'music')}
                >
                  {song ? <span className={styles.songName}>{song.name}</span> : 'Add music'}
                </Button>
              </div>
              {songWithWaveform && (
                <Waveform
                  song={songWithWaveform}
                  {...(onSong && {
                    clock: { media: audio, seek: songPlayback.seek },
                    markers: {
                      figures,
                      activeId: moment?.to.id ?? figure?.id ?? null,
                      move: stopped ? moveFigureTo : null,
                    },
                  })}
                />
              )}
              <FigureStrip
                figures={figures}
                active={{ id: moment?.to.id ?? figure.id, editable: stopped }}
                onSelect={selectFigure}
                onReorder={reorderFigures}
              />
            </section>
          )}
          {phone === 'landscape' && side}
        </main>
        {phone !== 'landscape' && side}
      </div>
    </div>
  );
}
