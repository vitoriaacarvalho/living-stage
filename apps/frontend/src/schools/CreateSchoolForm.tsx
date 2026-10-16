import { parseSchoolName, SCHOOL_NAME_MAX_LENGTH, type School } from '@living-stage/shared';
import { useState, type FormEvent } from 'react';
import { createSchool } from '../api/schools.ts';
import { Button } from '../ui/Button.tsx';
import styles from '../ui/Form.module.css';
import { TextField } from '../ui/TextField.tsx';

const blankNameError = 'Give your school a name.';
const fallbackError = 'Could not create the school. Try again.';

export function CreateSchoolForm({ onCreated }: { onCreated: (school: School) => void }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = parseSchoolName(new FormData(event.currentTarget).get('name'));
    if (!name) {
      setError(blankNameError);
      return;
    }
    setError(null);
    setPending(true);
    try {
      onCreated(await createSchool({ name }));
    } catch {
      setError(fallbackError);
      setPending(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <header className={styles.header}>
        <h1 className={styles.title}>Your school</h1>
        <p className={styles.lead}>
          Give it a name to start planning. You can invite teachers later.
        </p>
      </header>
      <TextField
        label="School name"
        name="name"
        autoComplete="organization"
        maxLength={SCHOOL_NAME_MAX_LENGTH}
        required
      />
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      <Button variant="primary" type="submit" width="full" disabled={pending}>
        Create school
      </Button>
    </form>
  );
}
