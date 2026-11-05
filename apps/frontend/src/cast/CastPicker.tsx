import {
  CAST_MAX_SIZE,
  type CastMember,
  type CastMemberInput,
  type Dancer,
  type DancerInput,
} from '@living-stage/shared';
import { useState } from 'react';
import { isSameName, matchesName } from '../dancers/match-name.ts';
import { useDancers } from '../dancers/useDancers.ts';
import { Button } from '../ui/Button.tsx';
import formStyles from '../ui/Form.module.css';
import { Icon } from '../ui/Icon.tsx';
import { TextField } from '../ui/TextField.tsx';
import styles from './CastList.module.css';
import { NewDancerForm } from './NewDancerForm.tsx';

type CastPickerProps = {
  schoolId: string;
  cast: CastMember[];
  onAdd: (input: CastMemberInput) => Promise<void>;
  onDone: () => void;
};

export const CAST_FULL_NOTE = `A dance holds up to ${CAST_MAX_SIZE} dancers. Remove one to add another.`;

const addCopy = { title: 'Add to cast', close: 'Done', pick: 'Add', failed: 'Could not add' };

// The picker stays open while dancers are added, so it is where the cast fills up.
export function CastPicker({ schoolId, cast, onAdd, onDone }: CastPickerProps) {
  if (cast.length >= CAST_MAX_SIZE) {
    return (
      <>
        <PickerHead copy={addCopy} onClose={onDone} />
        <p className={styles.empty}>{CAST_FULL_NOTE}</p>
      </>
    );
  }
  return (
    <RosterPicker
      schoolId={schoolId}
      cast={cast}
      copy={addCopy}
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
  const { state, add } = useDancers(schoolId);
  const [failed, setFailed] = useState<Dancer | null>(null);
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const typed = query.trim();
  const castIds = new Set(cast.map((member) => member.dancer?.id));

  async function pick(dancer: Dancer) {
    setFailed(null);
    try {
      await onPick(dancer);
    } catch {
      setFailed(dancer);
    }
  }

  async function create(input: DancerInput) {
    const dancer = await add(input);
    setCreating(false);
    setQuery('');
    await pick(dancer);
  }

  if (creating) {
    return <NewDancerForm name={typed} onSave={create} onCancel={() => setCreating(false)} />;
  }

  return (
    <>
      <PickerHead copy={copy} onClose={onClose} />
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
        <div className={styles.search}>
          <TextField
            label="Search by name"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            autoComplete="off"
          />
        </div>
      )}
      {state.status === 'ready' && !state.dancers.some(({ name }) => isSameName(name, typed)) && (
        <div className={styles.lead}>
          <button type="button" className={styles.pick} onClick={() => setCreating(true)}>
            <Icon name="plus" />
            <span className={styles.name}>
              {typed ? `Add “${typed}” as a new dancer` : 'New dancer'}
            </span>
          </button>
        </div>
      )}
      {state.status === 'ready' && (
        <Uncast
          dancers={state.dancers.filter(({ id }) => !castIds.has(id))}
          query={query}
          pickLabel={copy.pick}
          onPick={pick}
        />
      )}
    </>
  );
}

function PickerHead({ copy, onClose }: { copy: PickerCopy; onClose: () => void }) {
  return (
    <header className={styles.head}>
      <h2 className={styles.title}>{copy.title}</h2>
      <Button variant="secondary" className={styles.add} onClick={onClose}>
        {copy.close}
      </Button>
    </header>
  );
}

type UncastProps = {
  dancers: Dancer[];
  query: string;
  pickLabel: string;
  onPick: (dancer: Dancer) => void;
};

function Uncast({ dancers, query, pickLabel, onPick }: UncastProps) {
  if (dancers.length === 0) {
    return <p className={styles.empty}>Every dancer in the roster is in this dance.</p>;
  }
  const found = dancers.filter((dancer) => matchesName(dancer.name, query));
  if (found.length === 0) {
    return <p className={styles.empty}>No dancers match “{query.trim()}”.</p>;
  }
  return (
    <ul className={styles.list} aria-label="Dancers not in this dance">
      {found.map((dancer) => (
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
