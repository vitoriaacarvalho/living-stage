import {
  figureIndexAt,
  figureTimeMs,
  stageAt,
  type CastMember,
  type Dance,
  type Figure,
} from '@living-stage/shared';
import { type CSSProperties, useState } from 'react';
import { stageDancers } from '../cast/stage-dancers.ts';
import { figureLabel } from '../figures/figure-label.ts';
import { countdownTime } from '../playback/clock-time.ts';
import { usePlayback } from '../playback/usePlayback.ts';
import { STAGE_PLAN_ASPECT, Stage } from '../stage/Stage.tsx';
import { Icon } from '../ui/Icon.tsx';
import { leaveFullScreen, useFullScreenExit } from './full-screen.ts';
import { PresentationControls, type Steps } from './PresentationControls.tsx';
import styles from './PresentationMode.module.css';
import { usePresentationKeys } from './usePresentationKeys.ts';

const stageFit = { '--plan-aspect': STAGE_PLAN_ASPECT } as CSSProperties;

export type Presented = { dance: Dance; cast: CastMember[]; figures: Figure[] };

type PresentationModeProps = {
  presented: Presented;
  startFigureId: string;
  onLeave: (figureId: string) => void;
};

export function PresentationMode({ presented, startFigureId, onLeave }: PresentationModeProps) {
  const { dance, cast, figures } = presented;
  const [figureId, setFigureId] = useState(startFigureId);
  const selectedIndex = Math.max(
    0,
    figures.findIndex(({ id }) => id === figureId),
  );
  const playback = usePlayback({ figures, selectedIndex, onFinish: setFigureId });
  const moving = playback.status !== 'stopped';
  // The figure last reached: while a move plays, the one being left.
  const currentIndex = moving ? figureIndexAt(figures, playback.timeMs) : selectedIndex;
  const current = figures[currentIndex];
  const positions =
    (moving ? stageAt(figures, playback.timeMs)?.positions : current?.positions) ?? [];
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
            Next in {countdownTime(figureTimeMs(figures, nextIndex) - playback.timeMs)}
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
    </main>
  );
}
