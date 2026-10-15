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
          Não tem conta?{' '}
          <button type="button" onClick={() => setMode('signUp')}>
            Criar conta
          </button>
        </p>
      </main>
    );
  }

  return (
    <main>
      <SignUpForm />
      <p>
        Já tem conta?{' '}
        <button type="button" onClick={() => setMode('signIn')}>
          Entrar
        </button>
      </p>
    </main>
  );
}
