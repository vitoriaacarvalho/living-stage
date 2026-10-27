import type { Dancer, School } from '@living-stage/shared';
import { useState, type CSSProperties } from 'react';
import { Button } from '../ui/Button.tsx';
import formStyles from '../ui/Form.module.css';
import { dancerColorName, dancerColorVar, initials } from './dancer-colors.ts';
import { DancerForm } from './DancerForm.tsx';
import styles from './DancerRoster.module.css';
import { useDancers } from './useDancers.ts';

const loadError = 'Could not load the dancers. Go back and try again.';

type Editing = { dancer: Dancer | null } | null;

type DancerRosterProps = { school: School; onDone: () => void };

export function DancerRoster({ school, onDone }: DancerRosterProps) {
  const { state, ...actions } = useDancers(school.id);
  const [editing, setEditing] = useState<Editing>(null);

  return (
    <main className={editing ? `${styles.page} ${styles.editing}` : styles.page}>
      <div className={styles.main}>
        <header className={styles.head}>
          <div className={styles.heading}>
            <span className={styles.school}>{school.name}</span>
            <h1 className={styles.title}>Dancers</h1>
          </div>
          <div className={styles.headActions}>
            <Button variant="secondary" onClick={onDone}>
              Back
            </Button>
            <Button variant="primary" icon="plus" onClick={() => setEditing({ dancer: null })}>
              Add dancer
            </Button>
          </div>
        </header>
        {state.status === 'failed' && (
          <p role="alert" className={formStyles.error}>
            {loadError}
          </p>
        )}
        {state.status === 'ready' && (
          <DancerList
            dancers={state.dancers}
            selectedId={editing?.dancer?.id ?? null}
            onEdit={(dancer) => setEditing({ dancer })}
          />
        )}
      </div>
      {editing && (
        <aside className={styles.panel}>
          <DancerForm
            key={editing.dancer?.id ?? 'new'}
            dancer={editing.dancer}
            actions={actions}
            onClose={() => setEditing(null)}
          />
        </aside>
      )}
    </main>
  );
}

type DancerListProps = {
  dancers: Dancer[];
  selectedId: string | null;
  onEdit: (dancer: Dancer) => void;
};

function DancerList({ dancers, selectedId, onEdit }: DancerListProps) {
  if (dancers.length === 0) {
    return (
      <p className={styles.empty}>No dancers yet. Add them once and cast them in every dance.</p>
    );
  }
  return (
    <ul className={styles.list} aria-label="Dancers">
      {dancers.map((dancer) => (
        <li
          key={dancer.id}
          className={dancer.id === selectedId ? `${styles.row} ${styles.selected}` : styles.row}
        >
          <span
            className={styles.avatar}
            style={{ '--ring': dancerColorVar(dancer.color) } as CSSProperties}
            aria-hidden="true"
          >
            {initials(dancer.name)}
          </span>
          <div className={styles.who}>
            <span className={styles.name}>{dancer.name}</span>
            <span className={styles.color}>{dancerColorName(dancer.color)}</span>
          </div>
          <Button
            variant="ghost"
            icon="pencil"
            aria-label={`Edit ${dancer.name}`}
            onClick={() => onEdit(dancer)}
          />
        </li>
      ))}
    </ul>
  );
}
