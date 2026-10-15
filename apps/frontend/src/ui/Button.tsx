import type { ComponentProps, ReactNode } from 'react';
import styles from './Button.module.css';
import { Icon, type IconName } from './Icon.tsx';

type ButtonStyle = {
  variant: 'primary' | 'secondary' | 'soft' | 'ghost';
  size?: 'regular' | 'small';
  width?: 'fit' | 'full';
};

type ButtonContent =
  | { children: ReactNode; icon?: IconName }
  | { children?: never; icon: IconName; 'aria-label': string };

type ButtonProps = Omit<ComponentProps<'button'>, 'children'> & ButtonStyle & ButtonContent;

export function Button({
  variant,
  size = 'regular',
  width = 'fit',
  icon,
  children,
  type = 'button',
  className,
  ...rest
}: ButtonProps) {
  const classes = [
    styles.button,
    styles[variant],
    size === 'small' && styles.small,
    width === 'full' && styles.full,
    children === undefined && styles.iconOnly,
    className,
  ];

  return (
    <button type={type} className={classes.filter(Boolean).join(' ')} {...rest}>
      {icon && <Icon name={icon} />}
      {children}
    </button>
  );
}
