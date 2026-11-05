import type { ShowDetail } from '@living-stage/shared';
import { useState } from 'react';
import { Button } from '../ui/Button.tsx';
import formStyles from '../ui/Form.module.css';
import { Icon } from '../ui/Icon.tsx';
import { ActCard } from './ActCard.tsx';
import { actLabel } from './act-label.ts';
import { showWhen } from './show-when.ts';
import { ShowForm } from './ShowForm.tsx';
import styles from './ShowPage.module.css';
import { useShow, type ShowActions } from './useShow.ts';

type ShowPageProps = { schoolId: string; showId: string; onBack: () => void };

export function ShowPage({ schoolId, showId, onBack }: ShowPageProps) {
  const { state, ...actions } = useShow(schoolId, showId);
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
      {state.status === 'ready' && (
        <>
          <ShowHero show={state.show} actions={actions} onDeleted={onBack} />
          <Acts show={state.show} actions={actions} />
        </>
      )}
    </div>
  );
}

type ShowHeroProps = { show: ShowDetail; actions: ShowActions; onDeleted: () => void };

function ShowHero({ show, actions, onDeleted }: ShowHeroProps) {
  const [editing, setEditing] = useState(false);
  if (editing) {
    return (
      <div className={styles.editing}>
        <ShowForm show={show} onSave={actions.save} onClose={() => setEditing(false)} />
        <DeleteShow show={show} actions={actions} onDeleted={onDeleted} />
      </div>
    );
  }
  return (
    <header className={styles.hero}>
      <div className={styles.heroText}>
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
      </div>
      <Button variant="secondary" icon="pencil" onClick={() => setEditing(true)}>
        Edit
      </Button>
    </header>
  );
}

function DeleteShow({ show, actions, onDeleted }: ShowHeroProps) {
  const [confirming, setConfirming] = useState(false);
  const [failed, setFailed] = useState(false);
  const [pending, setPending] = useState(false);

  async function remove() {
    setFailed(false);
    setPending(true);
    try {
      await actions.remove();
      onDeleted();
    } catch {
      setFailed(true);
      setPending(false);
    }
  }

  if (!confirming) {
    return (
      <Button variant="ghost" className={styles.delete} onClick={() => setConfirming(true)}>
        Delete show
      </Button>
    );
  }
  return (
    <div className={styles.formActions}>
      <p className={styles.confirm}>
        Delete {show.title}? Its acts go too; the dances stay in the school.
      </p>
      <span className={styles.spacer} />
      <Button variant="secondary" onClick={() => setConfirming(false)} disabled={pending}>
        Keep
      </Button>
      <Button variant="primary" onClick={remove} disabled={pending}>
        Delete
      </Button>
      {failed && (
        <p role="alert" className={formStyles.error}>
          Could not delete the show. Try again.
        </p>
      )}
    </div>
  );
}

function Acts({ show, actions }: { show: ShowDetail; actions: ShowActions }) {
  const [failed, setFailed] = useState(false);
  const onlyAct = show.acts.length === 1;

  async function addAct() {
    setFailed(false);
    try {
      await actions.addAct();
    } catch {
      setFailed(true);
    }
  }

  return (
    <>
      <ol className={styles.acts} aria-label="Acts">
        {show.acts.map((act, index) => (
          <li key={act.id}>
            <ActCard
              act={act}
              label={actLabel(act, index)}
              actions={{
                saveAct: actions.saveAct,
                remove: onlyAct ? null : () => actions.removeAct(act.id),
              }}
            />
          </li>
        ))}
      </ol>
      <div>
        <Button variant="secondary" icon="plus" onClick={addAct}>
          New act
        </Button>
        {failed && (
          <p role="alert" className={formStyles.error}>
            Could not add the act. Try again.
          </p>
        )}
      </div>
    </>
  );
}
