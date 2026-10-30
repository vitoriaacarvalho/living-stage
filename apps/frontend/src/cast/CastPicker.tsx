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
  return (
    <RosterPicker
      schoolId={schoolId}
      cast={cast}
      copy={{ title: 'Add to cast', close: 'Done', pick: 'Add', failed: 'Could not add' }}
      onPick={(dancer) => onAdd({ dancerId: dancer.id, role: null })}
      onClose={onDone}
    />
  );
}

type SpotPickerProps = {
  schoolId: string;
  cast: CastMember[];
  onGive: (dancer: Dancer) => Promise<void>;
  onCancel: () => void;
};

export function SpotPicker({ schoolId, cast, onGive, onCancel }: SpotPickerProps) {
  return (
    <RosterPicker
      schoolId={schoolId}
      cast={cast}
      copy={{
        title: 'Give the spot to',
        close: 'Cancel',
        pick: 'Give',
        failed: 'Could not give the spot to',
      }}
      onPick={onGive}
      onClose={onCancel}
    />
  );
}

type PickerCopy = { title: string; close: string; pick: string; failed: string };

type RosterPickerProps = {
  schoolId: string;
  cast: CastMember[];
  copy: PickerCopy;
  onPick: (dancer: Dancer) => Promise<void>;
  onClose: () => void;
};

function RosterPicker({ schoolId, cast, copy, onPick, onClose }: RosterPickerProps) {
  const { state } = useDancers(schoolId);
  const [failed, setFailed] = useState<Dancer | null>(null);
  const castIds = new Set(cast.map((member) => member.dancer?.id));

  async function pick(dancer: Dancer) {
    setFailed(null);
    try {
      await onPick(dancer);
    } catch {
      setFailed(dancer);
    }
  }

  return (
    <>
      <header className={styles.head}>
        <h2 className={styles.title}>{copy.title}</h2>
        <Button variant="secondary" className={styles.add} onClick={onClose}>
          {copy.close}
        </Button>
      </header>
      {failed && (
        <p role="alert" className={formStyles.error}>
          {copy.failed} {failed.name}. Try again.
        </p>
      )}
      {state.status === 'failed' && (
        <p role="alert" className={formStyles.error}>
          Could not load the dancers. Go back and try again.
        </p>
      )}
      {state.status === 'ready' && (
        <Uncast
          dancers={state.dancers.filter(({ id }) => !castIds.has(id))}
          pickLabel={copy.pick}
          onPick={pick}
        />
      )}
    </>
  );
}

type UncastProps = { dancers: Dancer[]; pickLabel: string; onPick: (dancer: Dancer) => void };

function Uncast({ dancers, pickLabel, onPick }: UncastProps) {
  if (dancers.length === 0) {
    return <p className={styles.empty}>Every dancer in the roster is in this dance.</p>;
  }
  return (
    <ul className={styles.list} aria-label="Dancers not in this dance">
      {dancers.map((dancer) => (
        <li key={dancer.id}>
          <button type="button" className={styles.pick} onClick={() => onPick(dancer)}>
            <span className={styles.name}>{dancer.name}</span>
            <span className={styles.pickHint}>{pickLabel}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
