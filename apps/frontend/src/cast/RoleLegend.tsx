import { NO_ROLE_COLOR, roleColors, type CastMember } from '@living-stage/shared';
import type { CSSProperties } from 'react';
import { dancerColorVar } from '../dancers/dancer-colors.ts';
import styles from './RoleLegend.module.css';

export function RoleLegend({ cast }: { cast: CastMember[] }) {
  const colors = roleColors(cast);
  const anyWithoutRole = cast.some(({ dancer, role }) => dancer && role === null);
  const entries = anyWithoutRole ? [...colors, { role: 'No role', color: NO_ROLE_COLOR }] : colors;
  if (entries.length === 0) return null;
  return (
    <ul className={styles.legend} aria-label="Role colors">
      {entries.map(({ role, color }) => (
        <li key={role} className={styles.chip}>
          <span
            className={styles.dot}
            style={{ '--dot': dancerColorVar(color) } as CSSProperties}
            aria-hidden="true"
          />
          {role}
        </li>
      ))}
    </ul>
  );
}
