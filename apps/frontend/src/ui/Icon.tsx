import type { ReactNode } from 'react';
import styles from './Icon.module.css';

const paths = {
  back: <path d="M15 18l-6-6 6-6" />,
  copy: (
    <>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  home: (
    <>
      <path d="M3.5 11L12 3.5l8.5 7.5" />
      <path d="M5.5 9.5V20h13V9.5" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7.5a4 4 0 0 1 8 0V11" />
    </>
  ),
  pause: (
    <>
      <rect x="6.5" y="5" width="3.8" height="14" rx="1" fill="currentColor" stroke="none" />
      <rect x="13.7" y="5" width="3.8" height="14" rx="1" fill="currentColor" stroke="none" />
    </>
  ),
  pencil: <path d="M4 20h4L19 9a2.83 2.83 0 0 0-4-4L4 16v4zM13.5 6.5l4 4" />,
  play: <path d="M8 5.5v13l10.5-6.5z" fill="currentColor" />,
  plus: <path d="M12 5v14M5 12h14" />,
  school: (
    <>
      <path d="M2.5 9L12 4.5 21.5 9 12 13.5z" />
      <path d="M6 11v5c1.8 1.6 3.8 2.4 6 2.4s4.2-.8 6-2.4v-5" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20.5v-.5a6.5 6.5 0 0 1 13 0v.5" />
      <path d="M16 4.3a3.5 3.5 0 0 1 0 7.4M21.5 20.5V20a6.5 6.5 0 0 0-3.8-5.9" />
    </>
  ),
  x: <path d="M6 6l12 12M18 6L6 18" />,
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof paths;

export function Icon({ name }: { name: IconName }) {
  return (
    <svg
      className={styles.icon}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
