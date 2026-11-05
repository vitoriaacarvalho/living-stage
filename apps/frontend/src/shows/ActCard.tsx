import {
  ACT_NAME_MAX_LENGTH,
  parseActUpdate,
  type Act,
  type DanceSummary,
  type ShowDance,
} from '@living-stage/shared';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useState, type FormEvent } from 'react';
import { dancerCount } from '../cast/dancer-count.ts';
import { Button } from '../ui/Button.tsx';
import formStyles from '../ui/Form.module.css';
import { Icon } from '../ui/Icon.tsx';
import { TextField } from '../ui/TextField.tsx';
import styles from './ShowPage.module.css';
import type { ShowActions } from './useShow.ts';

// addable is the school's dances not yet in the show; remove is null for the only act.
export type ActTools = Pick<ShowActions, 'saveAct'> & {
  remove: (() => Promise<void>) | null;
  addDance: (danceId: string) => Promise<void>;
  removeDance: (dance: ShowDance) => Promise<void>;
  addable: Pick<DanceSummary, 'id' | 'title' | 'castCount'>[];
};

type ActCardProps = { act: Act; label: string; actions: ActTools };

export type DragKind = 'act' | 'dance';

// empty marks an act with no dances, the only kind of act a dance can land on by keyboard.
function useDragged(id: string, kind: DragKind, empty = false) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, data: { kind, empty } });
  return {
    node: { ref: setNodeRef, style: { transform: CSS.Translate.toString(transform), transition } },
    handle: { ref: setActivatorNodeRef, ...attributes, ...listeners },
    isDragging,
  };
}

type Handle = ReturnType<typeof useDragged>['handle'];

function Grip({ label, handle, kind }: { label: string; handle: Handle; kind: DragKind }) {
  return (
    <button
      type="button"
      className={styles.grip}
      {...handle}
      aria-roledescription={`draggable ${kind}`}
      aria-label={`Move ${label}`}
    >
      <Icon name="grip" />
    </button>
  );
}

export function ActCard({ act, label, actions }: ActCardProps) {
  const { node, handle, isDragging } = useDragged(act.id, 'act', act.dances.length === 0);
  const [renaming, setRenaming] = useState(false);
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function attempt(action: () => Promise<void>, failure: string) {
    setError(null);
    try {
      await action();
    } catch {
      setError(failure);
    }
  }

  return (
    <section
      {...node}
      className={isDragging ? `${styles.act} ${styles.lifted}` : styles.act}
      aria-label={label}
    >
      {renaming ? (
        <ActForm act={act} label={label} actions={actions} onClose={() => setRenaming(false)} />
      ) : (
        <div className={styles.actHead}>
          <Grip label={label} handle={handle} kind="act" />
          <h2 className={styles.actTitle}>{label}</h2>
          <Button
            variant="ghost"
            icon="pencil"
            aria-label={`Rename ${label}`}
            onClick={() => setRenaming(true)}
          />
        </div>
      )}
      {act.dances.length === 0 ? (
        <p className={styles.empty}>No dances in this act yet.</p>
      ) : (
        <SortableContext
          items={act.dances.map(({ id }) => id)}
          strategy={verticalListSortingStrategy}
        >
          <ol className={styles.rows}>
            {act.dances.map((dance, index) => (
              <DanceRow
                key={dance.id}
                dance={dance}
                place={index + 1}
                remove={{
                  label: `Take ${dance.title} out of ${label}`,
                  run: () =>
                    attempt(
                      () => actions.removeDance(dance),
                      `Could not take ${dance.title} out. Try again.`,
                    ),
                }}
              />
            ))}
          </ol>
        </SortableContext>
      )}
      {error && (
        <p role="alert" className={formStyles.error}>
          {error}
        </p>
      )}
      {picking ? (
        <DancePicker
          label={label}
          addable={actions.addable}
          onPick={(dance) =>
            attempt(() => actions.addDance(dance.id), `Could not add ${dance.title}. Try again.`)
          }
          onDone={() => setPicking(false)}
        />
      ) : (
        <Button variant="ghost" icon="plus" className={styles.add} onClick={() => setPicking(true)}>
          Add dance to {label}
        </Button>
      )}
    </section>
  );
}

type DanceRowProps = {
  dance: ShowDance;
  place: number;
  remove: { label: string; run: () => void };
};

function DanceRow({ dance, place, remove }: DanceRowProps) {
  const { node, handle, isDragging } = useDragged(dance.id, 'dance');
  return (
    <li {...node} className={isDragging ? `${styles.row} ${styles.lifted}` : styles.row}>
      <Grip label={dance.title} handle={handle} kind="dance" />
      <span className={styles.order}>{String(place).padStart(2, '0')}</span>
      <span className={styles.what}>
        <span className={styles.danceTitle}>{dance.title}</span>
        <span className={styles.cast}>
          <Icon name="users" />
          {dancerCount(dance.castCount)}
        </span>
      </span>
      <Button variant="ghost" icon="x" aria-label={remove.label} onClick={remove.run} />
    </li>
  );
}

type DancePickerProps = {
  label: string;
  addable: ActTools['addable'];
  onPick: (dance: ActTools['addable'][number]) => void;
  onDone: () => void;
};

function DancePicker({ label, addable, onPick, onDone }: DancePickerProps) {
  return (
    <div className={styles.picker} role="group" aria-label={`Add to ${label}`}>
      <div className={styles.pickerHead}>
        <h3 className={styles.pickerTitle}>Add to {label}</h3>
        <Button variant="secondary" onClick={onDone}>
          Done
        </Button>
      </div>
      {addable.length === 0 ? (
        <p className={styles.empty}>Every dance of the school is in this show.</p>
      ) : (
        <ul className={styles.pickList}>
          {addable.map((dance) => (
            <li key={dance.id}>
              <button type="button" className={styles.pick} onClick={() => onPick(dance)}>
                <span className={styles.danceTitle}>{dance.title}</span>
                <span className={styles.cast}>{dancerCount(dance.castCount)}</span>
                <span className={styles.pickHint}>Add</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

type ActFormProps = ActCardProps & { onClose: () => void };

function ActForm({ act, label, actions, onClose }: ActFormProps) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function run(action: () => Promise<void>, failure: string) {
    setError(null);
    setPending(true);
    try {
      await action();
      onClose();
    } catch {
      setError(failure);
      setPending(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const update = parseActUpdate({ name: new FormData(event.currentTarget).get('name') });
    if (update) run(() => actions.saveAct(act.id, update), 'Could not save the act. Try again.');
  }

  const leaving =
    act.dances.length === 1 ? 'Its dance leaves' : `Its ${act.dances.length} dances leave`;
  const remove = actions.remove;

  return (
    <form className={styles.actForm} onSubmit={handleSubmit} aria-label={`Rename ${label}`}>
      <TextField
        label="Name"
        name="name"
        defaultValue={act.name ?? ''}
        help="Optional. An act with no name is numbered."
        maxLength={ACT_NAME_MAX_LENGTH}
        autoComplete="off"
        autoFocus
      />
      {error && (
        <p role="alert" className={formStyles.error}>
          {error}
        </p>
      )}
      <div className={styles.formActions}>
        {confirming && remove ? (
          <>
            <p className={styles.confirm}>
              Delete {label}?{act.dances.length > 0 && ` ${leaving} the show.`}
            </p>
            <span className={styles.spacer} />
            <Button variant="secondary" onClick={() => setConfirming(false)} disabled={pending}>
              Keep
            </Button>
            <Button
              variant="primary"
              onClick={() => run(remove, 'Could not delete the act. Try again.')}
              disabled={pending}
            >
              Delete
            </Button>
          </>
        ) : (
          <>
            {remove && (
              <Button variant="ghost" className={styles.delete} onClick={() => setConfirming(true)}>
                Delete
              </Button>
            )}
            <span className={styles.spacer} />
            <Button variant="secondary" onClick={onClose} disabled={pending}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={pending}>
              Save
            </Button>
          </>
        )}
      </div>
    </form>
  );
}
