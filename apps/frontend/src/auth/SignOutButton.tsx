import { useState } from 'react';
import { Button } from '../ui/Button.tsx';
import { authClient } from './client.ts';

const errorMessage = 'Could not sign out. Try again.';

export function SignOutButton() {
  const [failed, setFailed] = useState(false);
  const [pending, setPending] = useState(false);

  async function handleClick() {
    setFailed(false);
    setPending(true);
    setFailed(!(await signOut()));
    setPending(false);
  }

  return (
    <>
      <Button variant="secondary" onClick={handleClick} disabled={pending}>
        Sign out
      </Button>
      {failed && <p role="alert">{errorMessage}</p>}
    </>
  );
}

async function signOut(): Promise<boolean> {
  try {
    const { error } = await authClient.signOut();
    return !error;
  } catch {
    return false;
  }
}
