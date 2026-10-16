import type { School } from '@living-stage/shared';
import { SignOutButton } from '../auth/SignOutButton.tsx';
import { AddSchool } from './AddSchool.tsx';

export function NoSchool({ onSchool }: { onSchool: (school: School) => void }) {
  return (
    <AddSchool onSchool={onSchool}>
      <SignOutButton />
    </AddSchool>
  );
}
