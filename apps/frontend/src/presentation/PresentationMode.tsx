import {
  figureIndexAt,
  stageAt,
  type CastMember,
  type Dance,
  type Figure,
} from '@living-stage/shared';
import { type CSSProperties, useEffect, useEffectEvent, useState } from 'react';
import { stageDancers } from '../cast/stage-dancers.ts';
import { figureLabel } from '../figures/figure-label.ts';
import { clockTime } from '../playback/clock-time.ts';
import { usePlayback } from '../playback/usePlayback.ts';
import { STAGE_PLAN_ASPECT, Stage } from '../stage/Stage.tsx';
import { Icon } from '../ui/Icon.tsx';
import { leaveFullScreen, useFullScreenExit } from './full-screen.ts';
import styles from './PresentationMode.module.css';

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
  const currentIndex = moving ? figureIndexAt(figures, playback.timeMs) : selectedIndex;
  const current = figures[currentIndex];
  const positions =
    (moving ? stageAt(figures, playback.timeMs)?.positions : current?.positions) ?? [];
  const playing = playback.status === 'playing';

  // Back in the editor, the figure last reached is selected.
  const leaveTo = () => onLeave(current?.id ?? figureId);

  function leave() {
    leaveFullScreen();
    leaveTo();
  }

  useFullScreenExit(leaveTo);
  useEscape(leave);

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
            {dance.title} · Figure {currentIndex + 1} of {figures.length}
          </p>
          {current && <h1 className={styles.name}>{figureLabel(current, currentIndex)}</h1>}
        </div>
      </header>
      <div className={styles.stageArea} style={stageFit}>
        <div className={styles.stageFit}>
          <Stage showGuides={dance.showGuides} dancers={stageDancers(cast, positions, dance)} />
        </div>
      </div>
      <div className={styles.controls}>
        <button
          type="button"
          className={styles.play}
          aria-label={playing ? 'Pause' : 'Play'}
          disabled={playback.lengthMs === 0}
          onClick={playing ? playback.pause : playback.play}
        >
          <Icon name={playing ? 'pause' : 'play'} />
        </button>
        <p className={styles.time}>
          {clockTime(playback.timeMs)}{' '}
          <span className={styles.length}>/ {clockTime(playback.lengthMs)}</span>
        </p>
      </div>
    </main>
  );
}

function useEscape(onEscape: () => void) {
  const escape = useEffectEvent(onEscape);
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') escape();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
}
