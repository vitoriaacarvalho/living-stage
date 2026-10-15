import { useState } from 'react';
import { SignInForm } from './SignInForm.tsx';
import { SignUpForm } from './SignUpForm.tsx';

type Mode = 'signIn' | 'signUp';

export function Access() {
  const [mode, setMode] = useState<Mode>('signIn');

  if (mode === 'signIn') {
    return (
      <main>
        <SignInForm />
        <p>
          Don't have an account?{' '}
          <button type="button" onClick={() => setMode('signUp')}>
            Create account
          </button>
        </p>
      </main>
    );
  }

  return (
    <main>
      <SignUpForm />
      <p>
        Already have an account?{' '}
        <button type="button" onClick={() => setMode('signIn')}>
          Sign in
        </button>
      </p>
    </main>
  );
}
