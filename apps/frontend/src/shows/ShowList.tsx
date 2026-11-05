import { inShowOrder, type ShowSummary } from '@living-stage/shared';
import { useState } from 'react';
import { Button } from '../ui/Button.tsx';
import formStyles from '../ui/Form.module.css';
import { localDay } from './show-when.ts';
import { ShowCard } from './ShowCard.tsx';
import { ShowForm } from './ShowForm.tsx';
import styles from '../dances/DanceList.module.css';
import { useShows } from './useShows.ts';

type ShowListProps = { schoolId: string; onOpen: (show: ShowSummary) => void };

export function ShowList({ schoolId, onOpen }: ShowListProps) {
  const { state, add } = useShows(schoolId);
  const [adding, setAdding] = useState(false);
  const today = localDay(new Date());

  return (
    <section className={styles.section} aria-labelledby="shows-heading">
      <header className={styles.head}>
        <h2 id="shows-heading" className={styles.title}>
          Shows
        </h2>
        {state.status === 'ready' && <span className={styles.count}>{state.shows.length}</span>}
        {!adding && (
          <Button variant="primary" icon="plus" onClick={() => setAdding(true)}>
            New show
          </Button>
        )}
      </header>
      {adding && <ShowForm show={null} onSave={add} onClose={() => setAdding(false)} />}
      {state.status === 'failed' && (
        <p role="alert" className={formStyles.error}>
          Could not load the shows. Reload the page to try again.
        </p>
      )}
      {state.status === 'ready' && state.shows.length === 0 && !adding && (
        <p className={styles.empty}>No shows yet. Create one to gather dances into acts.</p>
      )}
      {state.status === 'ready' && state.shows.length > 0 && (
        <ul className={styles.grid} aria-label="Shows">
          {inShowOrder(state.shows, today).map((show) => (
            <li key={show.id}>
              <ShowCard show={show} today={today} onOpen={() => onOpen(show)} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
