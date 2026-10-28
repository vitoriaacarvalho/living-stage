import type { Dance } from '@living-stage/shared';
import { useState } from 'react';
import { Button } from '../ui/Button.tsx';
import formStyles from '../ui/Form.module.css';
import { DanceForm } from './DanceForm.tsx';
import styles from './DanceList.module.css';
import { useDances } from './useDances.ts';

const loadError = 'Could not load the dances. Reload the page to try again.';

const addedOn = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

type Editing = { dance: Dance | null } | null;

export function DanceList({ schoolId }: { schoolId: string }) {
  const { state, ...actions } = useDances(schoolId);
  const [editing, setEditing] = useState<Editing>(null);
  const close = () => setEditing(null);

  return (
    <section className={styles.section} aria-labelledby="dances-heading">
      <header className={styles.head}>
        <h2 id="dances-heading" className={styles.title}>
          Dances
        </h2>
        {state.status === 'ready' && <span className={styles.count}>{state.dances.length}</span>}
        {!editing && (
          <Button variant="primary" icon="plus" onClick={() => setEditing({ dance: null })}>
            New dance
          </Button>
        )}
      </header>
      {editing?.dance === null && <DanceForm dance={null} actions={actions} onClose={close} />}
      {state.status === 'failed' && (
        <p role="alert" className={formStyles.error}>
          {loadError}
        </p>
      )}
      {state.status === 'ready' && state.dances.length === 0 && (
        <p className={styles.empty}>
          No dances yet. Create one to cast dancers and plan its figures.
        </p>
      )}
      {state.status === 'ready' && state.dances.length > 0 && (
        <ul className={styles.grid} aria-label="Dances">
          {state.dances.map((dance) => (
            <li key={dance.id}>
              {dance.id === editing?.dance?.id ? (
                <DanceForm dance={dance} actions={actions} onClose={close} />
              ) : (
                <DanceCard dance={dance} onRename={() => setEditing({ dance })} />
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function DanceCard({ dance, onRename }: { dance: Dance; onRename: () => void }) {
  return (
    <article className={styles.card}>
      <div className={styles.cardHead}>
        <h3 className={styles.danceTitle}>{dance.title}</h3>
        <Button
          variant="ghost"
          icon="pencil"
          aria-label={`Rename ${dance.title}`}
          onClick={onRename}
        />
      </div>
      <span className={styles.meta}>Added {addedOn.format(new Date(dance.createdAt))}</span>
    </article>
  );
}
