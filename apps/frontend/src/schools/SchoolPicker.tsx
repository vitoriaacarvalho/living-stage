import type { School } from '@living-stage/shared';
import formStyles from '../ui/Form.module.css';
import styles from './SchoolPicker.module.css';

type SchoolPickerProps = {
  schools: School[];
  currentId: string | null;
  onPick: (school: School) => void;
};

export function SchoolPicker({ schools, currentId, onPick }: SchoolPickerProps) {
  return (
    <div className={formStyles.form}>
      <header className={formStyles.header}>
        <h1 className={formStyles.title}>Your schools</h1>
        <p className={formStyles.lead}>Pick the school you want to plan for.</p>
      </header>
      <ul className={styles.list}>
        {schools.map((school) => (
          <li key={school.id}>
            <button
              type="button"
              className={styles.school}
              aria-current={school.id === currentId}
              onClick={() => onPick(school)}
            >
              <span className={styles.name}>{school.name}</span>
              {school.id === currentId && <span className={styles.current}>Current</span>}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
