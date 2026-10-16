import styles from './SegmentedControl.module.css';

type Option<T extends string> = { value: T; label: string };

type SegmentedControlProps<T extends string> = {
  label: string;
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
  surface?: 'light' | 'stage';
};

export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  surface = 'light',
}: SegmentedControlProps<T>) {
  return (
    <div role="group" aria-label={label} className={`${styles.track} ${styles[surface]}`}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={styles.segment}
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
