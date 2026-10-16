import type { School } from '@living-stage/shared';
import { SignOutButton } from '../auth/SignOutButton.tsx';
import { CardPage } from '../ui/CardPage.tsx';
import { CreateSchoolForm } from './CreateSchoolForm.tsx';

export function NoSchool({ onCreated }: { onCreated: (school: School) => void }) {
  return (
    <CardPage>
      <CreateSchoolForm onCreated={onCreated} />
      <SignOutButton />
    </CardPage>
  );
}
