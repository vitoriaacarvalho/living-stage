import type { Act, ShowDetail } from '@living-stage/shared';
import { dancerCount } from '../cast/dancer-count.ts';
import { Button } from '../ui/Button.tsx';
import formStyles from '../ui/Form.module.css';
import { Icon } from '../ui/Icon.tsx';
import { actLabel } from './act-label.ts';
import { showWhen } from './show-when.ts';
import styles from './ShowPage.module.css';
import { useShow } from './useShow.ts';

type ShowPageProps = { schoolId: string; showId: string; onBack: () => void };

export function ShowPage({ schoolId, showId, onBack }: ShowPageProps) {
  const { state } = useShow(schoolId, showId);
  return (
    <div className={styles.page}>
      <div className={styles.crumb}>
        <Button variant="ghost" icon="back" onClick={onBack}>
          Home
        </Button>
      </div>
      {state.status === 'failed' && (
        <p role="alert" className={formStyles.error}>
          Could not load the show. Go back and try again.
        </p>
      )}
      {state.status === 'ready' && <ShowDetails show={state.show} />}
    </div>
  );
}

function ShowDetails({ show }: { show: ShowDetail }) {
  return (
    <>
      <header className={styles.hero}>
        <h1 className={styles.title}>{show.title}</h1>
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
      </header>
      <ol className={styles.acts} aria-label="Acts">
        {show.acts.map((act, index) => (
          <li key={act.id}>
            <ActCard act={act} label={actLabel(act, index)} />
          </li>
        ))}
      </ol>
    </>
  );
}

function ActCard({ act, label }: { act: Act; label: string }) {
  return (
    <section className={styles.act} aria-label={label}>
      <h2 className={styles.actTitle}>{label}</h2>
      {act.dances.length === 0 ? (
        <p className={styles.empty}>No dances in this act yet.</p>
      ) : (
        <ol className={styles.rows}>
          {act.dances.map((dance, index) => (
            <li key={dance.id} className={styles.row}>
              <span className={styles.order}>{String(index + 1).padStart(2, '0')}</span>
              <span className={styles.danceTitle}>{dance.title}</span>
              <span className={styles.cast}>
                <Icon name="users" />
                {dancerCount(dance.castCount)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
