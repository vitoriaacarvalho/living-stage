import { APP_NAME } from '@living-stage/shared';
import { useState } from 'react';
import formStyles from '../ui/Form.module.css';
import { sketches } from '../ui/sketches.ts';
import styles from './Access.module.css';
import { SignInForm } from './SignInForm.tsx';
import { SignUpForm } from './SignUpForm.tsx';

type Mode = 'signIn' | 'signUp';

const screens = {
  signIn: {
    Form: SignInForm,
    tagline: 'Plan figures, music and shows for your school.',
    prompt: "Don't have an account?",
    action: 'Create account',
    other: 'signUp',
  },
  signUp: {
    Form: SignUpForm,
    tagline: 'It takes a minute. Your school comes next.',
    prompt: 'Already have an account?',
    action: 'Sign in',
    other: 'signIn',
  },
} as const satisfies Record<Mode, object>;

export function Access() {
  const [mode, setMode] = useState<Mode>('signIn');
  const { Form, tagline, prompt, action, other } = screens[mode];

  return (
    <main className={styles.page}>
      <SketchCollage />
      <section className={styles.card}>
        <header className={styles.brand}>
          <h1 className={styles.wordmark}>{APP_NAME}</h1>
          <p className={styles.tagline}>{tagline}</p>
        </header>
        <Form />
        <p className={formStyles.switch}>
          {prompt}{' '}
          <button type="button" className={formStyles.link} onClick={() => setMode(other)}>
            {action}
          </button>
        </p>
      </section>
    </main>
  );
}

function SketchCollage() {
  return (
    <div className={styles.collage} aria-hidden="true">
      <img className={styles.arabesque} src={sketches.arabesque} alt="" />
      <img className={styles.cambre} src={sketches.cambre} alt="" />
      <img className={styles.reverence} src={sketches.reverence} alt="" />
      <img className={styles.pointe} src={sketches.pointe} alt="" />
    </div>
  );
}
