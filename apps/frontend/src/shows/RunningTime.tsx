import {
  formatDuration,
  formatRunningTime,
  runningTime,
  type ShowDetail,
} from '@living-stage/shared';
import { Fragment } from 'react';
import { actLabel } from './act-label.ts';
import styles from './ShowPage.module.css';

// The design's running time: the total, a bar split into acts and intervals, and a legend
// in the same order as the bar.
export function RunningTime({ show }: { show: ShowDetail }) {
  const time = runningTime(show.acts, show.intervalMs);
  const intervals = show.intervalMs > 0 ? time.intervals : 0;
  return (
    <section className={styles.total} aria-label="Total running time">
      <span className={styles.totalLabel}>Total running time</span>
      <p className={styles.totalTime}>{formatRunningTime(time.totalMs)}</p>
      {time.totalMs > 0 && (
        <div className={styles.bar} aria-hidden="true">
          {time.acts.map((ms, index) => (
            <Fragment key={show.acts[index]!.id}>
              {index > 0 && intervals > 0 && (
                <i className={styles.barInterval} style={{ flexGrow: show.intervalMs }} />
              )}
              <i
                className={index % 2 === 0 ? styles.barAct : styles.barActAlt}
                style={{ flexGrow: ms }}
              />
            </Fragment>
          ))}
        </div>
      )}
      <ul className={styles.legend}>
        {show.acts.map((act, index) => (
          <Fragment key={act.id}>
            {index > 0 && intervals > 0 && (
              <li>
                Interval <b>{formatDuration(show.intervalMs)}</b>
              </li>
            )}
            <li>
              {actLabel(act, index)} <b>{formatDuration(time.acts[index]!)}</b>
            </li>
          </Fragment>
        ))}
      </ul>
      {time.untimed > 0 && (
        <p className={styles.untimed}>
          {time.untimed === 1 ? '1 dance has' : `${time.untimed} dances have`} no time yet.
        </p>
      )}
    </section>
  );
}
