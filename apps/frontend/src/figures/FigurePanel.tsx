import { FIGURE_NAME_MAX_LENGTH, parseFigureName, type Figure } from '@living-stage/shared';
import { useState, type FormEvent } from 'react';
import panelStyles from '../cast/CastList.module.css';
import styles from '../cast/CastMemberForm.module.css';
import { Button } from '../ui/Button.tsx';
import formStyles from '../ui/Form.module.css';
import { TextField } from '../ui/TextField.tsx';

type FigurePanelProps = {
  figure: Figure;
  label: string;
  onRename: (name: string | null) => Promise<void>;
  onClose: () => void;
};

export function FigurePanel({ figure, label, onRename, onClose }: FigurePanelProps) {
  const [failed, setFailed] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = parseFigureName(new FormData(event.currentTarget).get('name')) ?? null;
    setFailed(false);
    setPending(true);
    try {
      await onRename(name);
      onClose();
    } catch {
      setFailed(true);
      setPending(false);
    }
  }

  return (
    <aside className={panelStyles.panel} aria-label="Figure">
      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.head}>
          <h2 className={styles.title}>{label}</h2>
          <Button variant="ghost" icon="x" aria-label="Close" onClick={onClose} />
        </div>
        <TextField
          label="Name"
          name="name"
          defaultValue={figure.name ?? ''}
          help="Optional. A figure with no name is numbered."
          maxLength={FIGURE_NAME_MAX_LENGTH}
          autoComplete="off"
        />
        {failed && (
          <p role="alert" className={formStyles.error}>
            Could not save the name. Try again.
          </p>
        )}
        <div className={styles.actions}>
          <span className={styles.spacer} />
          <Button variant="primary" type="submit" disabled={pending}>
            Save
          </Button>
        </div>
      </form>
    </aside>
  );
}
