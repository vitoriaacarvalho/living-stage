import { useState, type ComponentProps } from 'react';
import { Button } from './Button.tsx';
import { TextField } from './TextField.tsx';

type PasswordFieldProps = Omit<ComponentProps<typeof TextField>, 'type' | 'trailing'>;

export function PasswordField(props: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <TextField
      {...props}
      type={visible ? 'text' : 'password'}
      trailing={
        <Button
          variant={visible ? 'soft' : 'ghost'}
          icon="eye"
          aria-label={visible ? 'Hide password' : 'Show password'}
          onClick={() => setVisible(!visible)}
        />
      }
    />
  );
}
