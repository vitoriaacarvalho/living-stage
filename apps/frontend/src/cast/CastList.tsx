import {
  CAST_MAX_SIZE,
  roleColors,
  type CastMember,
  type ColorMode,
  type Dancer,
  type DancerColor,
} from '@living-stage/shared';
import { useState, type CSSProperties } from 'react';
import { dancerColorVar, initials, initialsInk } from '../dancers/dancer-colors.ts';
import { Button } from '../ui/Button.tsx';
import formStyles from '../ui/Form.module.css';
import { castMemberColor } from './cast-color.ts';
import { CastMemberForm } from './CastMemberForm.tsx';
import { CAST_FULL_NOTE, CastPicker, SpotPicker } from './CastPicker.tsx';
import { RoleLegend } from './RoleLegend.tsx';
import styles from './CastList.module.css';
import type { CastActions, CastState } from './useCast.ts';

type Panel =
  | { view: 'list' }
  | { view: 'picking' }
  | { view: 'editing'; castMember: CastMember }
  | { view: 'giving'; castMember: CastMember };

type CastListProps = {
  schoolId: string;
  state: CastState;
  actions: CastActions;
  colorMode: ColorMode;
};

export function CastList({ schoolId, state, actions, colorMode }: CastListProps) {
  const [panel, setPanel] = useState<Panel>({ view: 'list' });
  const showList = () => setPanel({ view: 'list' });
  const full = state.status === 'ready' && state.cast.length >= CAST_MAX_SIZE;

  if (panel.view === 'picking' && state.status === 'ready') {
    return (
      <aside className={styles.panel} aria-label="Cast">
        <CastPicker schoolId={schoolId} cast={state.cast} onAdd={actions.add} onDone={showList} />
      </aside>
    );
  }
  if (panel.view === 'giving' && state.status === 'ready') {
    const { castMember } = panel;
    async function give(dancer: Dancer) {
      await actions.give(castMember.id, dancer.id);
      showList();
    }
    return (
      <aside className={styles.panel} aria-label="Cast">
        <SpotPicker schoolId={schoolId} cast={state.cast} onGive={give} onCancel={showList} />
      </aside>
    );
  }
  if (panel.view === 'editing') {
    const { castMember } = panel;
    return (
      <aside className={styles.panel} aria-label="Cast">
        <CastMemberForm
          castMember={castMember}
          actions={actions}
          onClose={showList}
          onGive={() => setPanel({ view: 'giving', castMember })}
        />
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
          disabled={state.status !== 'ready' || full}
          onClick={() => setPanel({ view: 'picking' })}
        >
          Add
        </Button>
      </header>
      {full && <p className={styles.note}>{CAST_FULL_NOTE}</p>}
      {state.status === 'ready' && colorMode === 'role' && <RoleLegend cast={state.cast} />}
      {state.status === 'failed' && (
        <p role="alert" className={formStyles.error}>
          Could not load the cast. Go back and try again.
        </p>
      )}
      {state.status === 'ready' && (
        <CastRows
          cast={state.cast}
          colorMode={colorMode}
          onEdit={(castMember) => setPanel({ view: 'editing', castMember })}
        />
      )}
    </aside>
  );
}

type CastRowsProps = {
  cast: CastMember[];
  colorMode: ColorMode;
  onEdit: (castMember: CastMember) => void;
};

function CastRows({ cast, colorMode, onEdit }: CastRowsProps) {
  if (cast.length === 0) {
    return <p className={styles.empty}>No dancers in this dance yet. Add them from the roster.</p>;
  }
  const colors = roleColors(cast);
  return (
    <ul className={styles.list} aria-label="Cast members">
      {cast.map((member) => (
        <li key={member.id} className={styles.row}>
          <CastSwatch member={member} color={castMemberColor(member, colorMode, colors)} />
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

type CastSwatchProps = { member: CastMember; color: DancerColor | null };

function CastSwatch({ member, color }: CastSwatchProps) {
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
