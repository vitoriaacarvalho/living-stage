import type { CastMember, CastMemberInput, Dancer } from '@living-stage/shared';
import { useState } from 'react';
import { useDancers } from '../dancers/useDancers.ts';
import { Button } from '../ui/Button.tsx';
import formStyles from '../ui/Form.module.css';
import styles from './CastList.module.css';

type CastPickerProps = {
  schoolId: string;
  cast: CastMember[];
  onAdd: (input: CastMemberInput) => Promise<void>;
  onDone: () => void;
};

export function CastPicker({ schoolId, cast, onAdd, onDone }: CastPickerProps) {
  const { state } = useDancers(schoolId);
  const [failed, setFailed] = useState<Dancer | null>(null);
  const castIds = new Set(cast.map((member) => member.dancer?.id));

  async function add(dancer: Dancer) {
    setFailed(null);
    try {
      await onAdd({ dancerId: dancer.id, role: null });
    } catch {
      setFailed(dancer);
    }
  }

  return (
    <>
      <header className={styles.head}>
        <h2 className={styles.title}>Add to cast</h2>
        <Button variant="secondary" className={styles.add} onClick={onDone}>
          Done
        </Button>
      </header>
      {failed && (
        <p role="alert" className={formStyles.error}>
          Could not add {failed.name}. Try again.
        </p>
      )}
      {state.status === 'failed' && (
        <p role="alert" className={formStyles.error}>
          Could not load the dancers. Go back and try again.
        </p>
      )}
      {state.status === 'ready' && (
        <Uncast dancers={state.dancers.filter(({ id }) => !castIds.has(id))} onAdd={add} />
      )}
    </>
  );
}

function Uncast({ dancers, onAdd }: { dancers: Dancer[]; onAdd: (dancer: Dancer) => void }) {
  if (dancers.length === 0) {
    return <p className={styles.empty}>Every dancer in the roster is in this dance.</p>;
  }
  return (
    <ul className={styles.list} aria-label="Dancers to add">
      {dancers.map((dancer) => (
        <li key={dancer.id}>
          <button type="button" className={styles.pick} onClick={() => onAdd(dancer)}>
            <span className={styles.name}>{dancer.name}</span>
            <span className={styles.pickHint}>Add</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
