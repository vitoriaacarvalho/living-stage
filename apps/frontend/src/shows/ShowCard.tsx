import { isPerformed, type ShowSummary } from '@living-stage/shared';
import { StageThumbnail } from '../stage/StageThumbnail.tsx';
import { Icon } from '../ui/Icon.tsx';
import { showCounts, showWhen } from './show-when.ts';
import listStyles from '../dances/DanceList.module.css';
import styles from './Shows.module.css';

type ShowCardProps = { show: ShowSummary; today: string; onOpen: () => void };

export function ShowCard({ show, today, onOpen }: ShowCardProps) {
  return (
    <article className={listStyles.card}>
      <div className={`${listStyles.art} ${styles.art}`}>
        <StageThumbnail spots={show.preview} />
        {isPerformed(show, today) && <span className={styles.chip}>Performed</span>}
      </div>
      <div className={listStyles.body}>
        <h3 className={styles.showTitle}>
          <button type="button" className={listStyles.open} onClick={onOpen}>
            {show.title}
          </button>
        </h3>
        <div className={styles.meta}>
          <span>
            <Icon name="calendar" />
            {showWhen(show)}
          </span>
          {show.venue && (
            <span>
              <Icon name="pin" />
              {show.venue}
            </span>
          )}
        </div>
        <p className={styles.counts}>{showCounts(show)}</p>
      </div>
    </article>
  );
}
