import { useId, type ComponentProps, type ReactNode } from 'react';
import styles from './TextField.module.css';

type TextFieldProps = Omit<ComponentProps<'input'>, 'className' | 'id'> & {
  label: string;
  help?: string;
  trailing?: ReactNode;
};

export function TextField({ label, help, trailing, ...input }: TextFieldProps) {
  const inputId = useId();
  const helpId = useId();

  return (
    <div className={styles.field}>
      <label htmlFor={inputId} className={styles.label}>
        {label}
      </label>
      <div className={styles.control}>
        <input
          id={inputId}
          className={trailing ? `${styles.input} ${styles.withTrailing}` : styles.input}
          aria-describedby={help ? helpId : undefined}
          {...input}
        />
        {trailing && <div className={styles.trailing}>{trailing}</div>}
      </div>
      {help && (
        <span id={helpId} className={styles.help}>
          {help}
        </span>
      )}
    </div>
  );
}
