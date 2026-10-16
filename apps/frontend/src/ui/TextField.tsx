import { useId, type ComponentProps } from 'react';
import styles from './TextField.module.css';

type TextFieldProps = Omit<ComponentProps<'input'>, 'className' | 'id'> & {
  label: string;
  help?: string;
};

export function TextField({ label, help, ...input }: TextFieldProps) {
  const inputId = useId();
  const helpId = useId();

  return (
    <div className={styles.field}>
      <label htmlFor={inputId} className={styles.label}>
        {label}
      </label>
      <input
        id={inputId}
        className={styles.input}
        aria-describedby={help ? helpId : undefined}
        {...input}
      />
      {help && (
        <span id={helpId} className={styles.help}>
          {help}
        </span>
      )}
    </div>
  );
}
