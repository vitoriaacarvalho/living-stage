import type { CastMember } from '@living-stage/shared';
import { useState, type CSSProperties } from 'react';
import { dancerColorVar, initials, initialsInk } from '../dancers/dancer-colors.ts';
import { Button } from '../ui/Button.tsx';
import formStyles from '../ui/Form.module.css';
import { CastMemberForm } from './CastMemberForm.tsx';
import { CastPicker } from './CastPicker.tsx';
import styles from './CastList.module.css';
import { useCast } from './useCast.ts';

type Panel = { view: 'list' } | { view: 'picking' } | { view: 'editing'; castMember: CastMember };

type CastListProps = { schoolId: string; danceId: string };

export function CastList({ schoolId, danceId }: CastListProps) {
  const { state, ...actions } = useCast(schoolId, danceId);
  const [panel, setPanel] = useState<Panel>({ view: 'list' });
  const showList = () => setPanel({ view: 'list' });

  if (panel.view === 'picking' && state.status === 'ready') {
    return (
      <aside className={styles.panel} aria-label="Cast">
        <CastPicker schoolId={schoolId} cast={state.cast} onAdd={actions.add} onDone={showList} />
      </aside>
    );
  }
  if (panel.view === 'editing') {
    return (
      <aside className={styles.panel} aria-label="Cast">
        <CastMemberForm castMember={panel.castMember} actions={actions} onClose={showList} />
      </aside>
    );
  }
  return (
    <aside className={styles.panel} aria-label="Cast">
      <header className={styles.head}>
        <h2 className={styles.title}>Cast</h2>
        {state.status === 'ready' && (
          <span className={styles.count} aria-label={dancerCount(state.cast.length)}>
            {state.cast.length}
          </span>
        )}
        <Button
          variant="soft"
          icon="plus"
          className={styles.add}
          disabled={state.status !== 'ready'}
          onClick={() => setPanel({ view: 'picking' })}
        >
          Add
        </Button>
      </header>
      {state.status === 'failed' && (
        <p role="alert" className={formStyles.error}>
          Could not load the cast. Go back and try again.
        </p>
      )}
      {state.status === 'ready' && (
        <CastRows
          cast={state.cast}
          onEdit={(castMember) => setPanel({ view: 'editing', castMember })}
        />
      )}
    </aside>
  );
}

type CastRowsProps = { cast: CastMember[]; onEdit: (castMember: CastMember) => void };

function CastRows({ cast, onEdit }: CastRowsProps) {
  if (cast.length === 0) {
    return <p className={styles.empty}>No dancers in this dance yet. Add them from the roster.</p>;
  }
  return (
    <ul className={styles.list} aria-label="Cast members">
      {cast.map((member) => (
        <li key={member.id} className={styles.row}>
          <CastSwatch member={member} />
          <div className={styles.who}>
            <span className={styles.name}>{member.dancer?.name ?? 'Open spot'}</span>
            {member.role && <span className={styles.role}>{member.role}</span>}
          </div>
          <Button
            variant="ghost"
            icon="pencil"
            aria-label={`Edit ${member.dancer?.name ?? 'open spot'}`}
            onClick={() => onEdit(member)}
          />
        </li>
      ))}
    </ul>
  );
}

function CastSwatch({ member }: { member: CastMember }) {
  const color = member.dancer?.color ?? null;
  const swatch = {
    '--swatch': color === null ? 'var(--surface-sunken)' : dancerColorVar(color),
    '--swatch-ink': initialsInk(color),
  } as CSSProperties;
  return (
    <span className={styles.swatch} style={swatch} aria-hidden="true">
      {member.dancer ? initials(member.dancer.name) : ''}
    </span>
  );
}

function dancerCount(count: number) {
  return count === 1 ? '1 dancer' : `${count} dancers`;
}
