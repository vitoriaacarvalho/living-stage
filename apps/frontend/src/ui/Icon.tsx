import type { ReactNode } from 'react';
import styles from './Icon.module.css';

const paths = {
  back: <path d="M15 18l-6-6 6-6" />,
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </>
  ),
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
  grip: (
    <g fill="currentColor" stroke="none">
      <circle cx="9" cy="6" r="1.5" />
      <circle cx="15" cy="6" r="1.5" />
      <circle cx="9" cy="12" r="1.5" />
      <circle cx="15" cy="12" r="1.5" />
      <circle cx="9" cy="18" r="1.5" />
      <circle cx="15" cy="18" r="1.5" />
    </g>
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
  minus: <path d="M5 12h14" />,
  path: (
    <>
      <path d="M5 18c5 0 3-12 8-12 3.2 0 3.6 5 6 8" />
      <circle cx="5" cy="18" r="2" />
      <path d="M16.5 14.8l2.6-.9.4 2.8" />
    </>
  ),
  next: (
    <>
      <path d="M6 5l9 7-9 7z" fill="currentColor" />
      <path d="M18 5v14" />
    </>
  ),
  pause: (
    <>
      <rect x="6.5" y="5" width="3.8" height="14" rx="1" fill="currentColor" stroke="none" />
      <rect x="13.7" y="5" width="3.8" height="14" rx="1" fill="currentColor" stroke="none" />
    </>
  ),
  pencil: <path d="M4 20h4L19 9a2.83 2.83 0 0 0-4-4L4 16v4zM13.5 6.5l4 4" />,
  pin: (
    <>
      <path d="M12 21s-6.5-5.8-6.5-11a6.5 6.5 0 0 1 13 0c0 5.2-6.5 11-6.5 11z" />
      <circle cx="12" cy="10" r="2.3" />
    </>
  ),
  play: <path d="M8 5.5v13l10.5-6.5z" fill="currentColor" />,
  plus: <path d="M12 5v14M5 12h14" />,
  present: (
    <>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
      <path d="M10.5 7.8v4.4l3.8-2.2z" fill="currentColor" />
    </>
  ),
  previous: (
    <>
      <path d="M18 19L9 12l9-7z" fill="currentColor" />
      <path d="M6 5v14" />
    </>
  ),
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
