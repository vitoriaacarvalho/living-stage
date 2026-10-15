import { useState } from 'react';
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
      <button type="button" onClick={handleClick} disabled={pending}>
        Sign out
      </button>
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
