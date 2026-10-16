import { useState } from 'react';
import styles from './Access.module.css';
import { SignInForm } from './SignInForm.tsx';
import { SignUpForm } from './SignUpForm.tsx';

type Mode = 'signIn' | 'signUp';

const screens = {
  signIn: {
    Form: SignInForm,
    prompt: "Don't have an account?",
    action: 'Create account',
    other: 'signUp',
  },
  signUp: {
    Form: SignUpForm,
    prompt: 'Already have an account?',
    action: 'Sign in',
    other: 'signIn',
  },
} as const satisfies Record<Mode, object>;

export function Access() {
  const [mode, setMode] = useState<Mode>('signIn');
  const { Form, prompt, action, other } = screens[mode];

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <Form />
        <p className={styles.switch}>
          {prompt}{' '}
          <button type="button" className={styles.link} onClick={() => setMode(other)}>
            {action}
          </button>
        </p>
      </section>
    </main>
  );
}
