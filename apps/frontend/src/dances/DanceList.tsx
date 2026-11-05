import type { Dance, DanceSummary } from '@living-stage/shared';
import { useState } from 'react';
import { dancerCount } from '../cast/dancer-count.ts';
import { StageThumbnail } from '../stage/StageThumbnail.tsx';
import { Button } from '../ui/Button.tsx';
import formStyles from '../ui/Form.module.css';
import { Icon } from '../ui/Icon.tsx';
import { DanceForm } from './DanceForm.tsx';
import styles from './DanceList.module.css';
import { useDances } from './useDances.ts';

const loadError = 'Could not load the dances. Reload the page to try again.';
const duplicateError = (title: string) => `Could not duplicate ${title}. Try again.`;

const addedOn = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

type Editing = { dance: Dance | null } | null;

type DanceListProps = { schoolId: string; onOpen: (dance: Dance) => void };

export function DanceList({ schoolId, onOpen }: DanceListProps) {
  const { state, ...actions } = useDances(schoolId);
  const [editing, setEditing] = useState<Editing>(null);
  const [duplicating, setDuplicating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const close = () => setEditing(null);

  async function duplicate(dance: Dance) {
    if (duplicating) return;
    setError(null);
    setDuplicating(true);
    try {
      setEditing({ dance: await actions.duplicate(dance.id) });
    } catch {
      setError(duplicateError(dance.title));
    } finally {
      setDuplicating(false);
    }
  }

  return (
    <section className={styles.section} aria-labelledby="dances-heading">
      <header className={styles.head}>
        <h2 id="dances-heading" className={styles.title}>
          Dances
        </h2>
        {state.status === 'ready' && <span className={styles.count}>{state.dances.length}</span>}
        {!editing && (
          <Button variant="secondary" icon="plus" onClick={() => setEditing({ dance: null })}>
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
      {error && (
        <p role="alert" className={formStyles.error}>
          {error}
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
                <DanceCard
                  dance={dance}
                  on={{
                    open: () => onOpen(dance),
                    rename: () => setEditing({ dance }),
                    duplicate: () => duplicate(dance),
                  }}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

type DanceCardActions = { open: () => void; rename: () => void; duplicate: () => void };

type DanceCardProps = { dance: DanceSummary; on: DanceCardActions };

function DanceCard({ dance, on }: DanceCardProps) {
  return (
    <article className={styles.card}>
      <div className={styles.art}>
        <StageThumbnail spots={dance.preview} />
      </div>
      <div className={styles.body}>
        <div className={styles.cardHead}>
          <h3 className={styles.danceTitle}>
            <button type="button" className={styles.open} onClick={on.open}>
              {dance.title}
            </button>
          </h3>
          <Button
            variant="ghost"
            icon="pencil"
            aria-label={`Rename ${dance.title}`}
            onClick={on.rename}
          />
          <Button
            variant="ghost"
            icon="copy"
            aria-label={`Duplicate ${dance.title}`}
            onClick={on.duplicate}
          />
        </div>
        <span className={styles.meta}>
          <Icon name="users" />
          {dancerCount(dance.castCount)}
        </span>
        <span className={styles.meta}>Added {addedOn.format(new Date(dance.createdAt))}</span>
      </div>
    </article>
  );
}
