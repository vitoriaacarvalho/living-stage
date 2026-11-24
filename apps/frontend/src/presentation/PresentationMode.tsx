import {
  figureIndexAt,
  figureTimeMs,
  isPinned,
  songTimed,
  stageAt,
  type CastMember,
  type Dance,
  type Figure,
} from '@living-stage/shared';
import { type CSSProperties, useState } from 'react';
import { stageDancers } from '../cast/stage-dancers.ts';
import { figureLabel } from '../figures/figure-label.ts';
import { countdownTime } from '../playback/clock-time.ts';
import { SongControls } from '../playback/SongControls.tsx';
import { usePlayback } from '../playback/usePlayback.ts';
import { useSongPlayback } from '../playback/useSongPlayback.ts';
import { STAGE_PLAN_ASPECT, Stage } from '../stage/Stage.tsx';
import { Icon } from '../ui/Icon.tsx';
import { leaveFullScreen, useFullScreenExit } from './full-screen.ts';
import { PresentationControls, type Steps } from './PresentationControls.tsx';
import styles from './PresentationMode.module.css';
import { usePresentationKeys } from './usePresentationKeys.ts';

const stageFit = { '--plan-aspect': STAGE_PLAN_ASPECT } as CSSProperties;

// The editor's own audio element, already holding the song, so presenting plays the
// same player; null for a dance presented on its move times.
export type PresentedMusic = { audio: HTMLAudioElement; songMs: number };

export type Presented = {
  dance: Dance;
  cast: CastMember[];
  figures: Figure[];
  music: PresentedMusic | null;
};

type PresentationModeProps = {
  presented: Presented;
  startFigureId: string;
  onLeave: (figureId: string) => void;
};

export function PresentationMode({ presented, startFigureId, onLeave }: PresentationModeProps) {
  const { dance, cast, figures, music } = presented;
  const [spareAudio] = useState(() => new Audio());
  const [figureId, setFigureId] = useState(startFigureId);
  const selectedIndex = Math.max(
    0,
    figures.findIndex(({ id }) => id === figureId),
  );
  const movesPlayback = usePlayback({ figures, selectedIndex, onFinish: setFigureId });
  // The song is already loaded by the editor (url null), so leaving never unloads it.
  const songPlayback = useSongPlayback(
    music?.audio ?? spareAudio,
    { figures, selectedIndex, songMs: music?.songMs ?? 0, url: null },
    setFigureId,
  );
  const onSong = music !== null && isPinned(figures);
  const playback = onSong ? songPlayback : movesPlayback;
  const timed = onSong ? songTimed(figures) : figures;
  // Where the move math stands: the song time, counted from the first figure's moment.
  const stageMs = playback.timeMs - (onSong ? (figures[0]?.timeMs ?? 0) : 0);
  const moving = playback.status !== 'stopped';
  // The figure last reached: while a move plays, the one being left.
  const currentIndex = moving ? figureIndexAt(timed, stageMs) : selectedIndex;
  const current = figures[currentIndex];
  const positions = (moving ? stageAt(timed, stageMs)?.positions : current?.positions) ?? [];
  const nextIndex = currentIndex + 1;
  const next = figures[nextIndex];
  // Part way through a move, Previous goes back to where it started.
  const previousIndex = moving ? currentIndex : selectedIndex - 1;
  const previous = figures[previousIndex];

  const steps: Steps = {
    ...(previous && {
      previous: () => {
        playback.stop();
        setFigureId(previous.id);
      },
    }),
    ...(next && { next: () => playback.playTo(nextIndex) }),
  };

  const leaveTo = () => onLeave(current?.id ?? figureId);

  function leave() {
    leaveFullScreen();
    leaveTo();
  }

  useFullScreenExit(leaveTo);
  usePresentationKeys({
    ...steps,
    leave,
    toggle: playback.status === 'playing' ? playback.pause : playback.play,
  });

  return (
    <main className={styles.presentation} aria-label={`Presenting ${dance.title}`}>
      <header className={styles.top}>
        <button
          type="button"
          className={styles.round}
          aria-label="Leave presentation"
          onClick={leave}
        >
          <Icon name="x" />
        </button>
        <div className={styles.heading}>
          <p className={styles.kicker}>
            {dance.title} ·{' '}
            <span className={styles.keep}>
              Figure {currentIndex + 1} of {figures.length}
            </span>
          </p>
          {current && <h1 className={styles.name}>{figureLabel(current, currentIndex)}</h1>}
        </div>
        {next && (
          <p className={styles.next}>
            Next in {countdownTime(figureTimeMs(timed, nextIndex) - stageMs)}
            <b className={styles.nextName}>
              Figure {nextIndex + 1}
              {next.name && ` · ${next.name}`}
            </b>
          </p>
        )}
      </header>
      <div className={styles.stageArea} style={stageFit}>
        <div className={styles.stageFit}>
          <Stage showGuides={dance.showGuides} dancers={stageDancers(cast, positions, dance)} />
        </div>
      </div>
      <PresentationControls playback={playback} steps={steps} />
      {onSong && (
        <div className={styles.songControls}>
          <SongControls playback={songPlayback} surface="stage" />
        </div>
      )}
    </main>
  );
}
