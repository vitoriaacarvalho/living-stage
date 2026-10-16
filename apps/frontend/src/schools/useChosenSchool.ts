import type { School } from '@living-stage/shared';
import { useState } from 'react';

// Per tab: a reload stays in the school, a new visit asks again.
const storageKey = 'living-stage.school';

export function findChosenSchool(schools: School[], chosenId: string | null): School | null {
  if (schools.length === 1) return schools[0] ?? null;
  return schools.find(({ id }) => id === chosenId) ?? null;
}

export function useChosenSchoolId() {
  const [chosenId, setChosenId] = useState(readChosenId);

  function choose(id: string) {
    setChosenId(id);
    try {
      sessionStorage.setItem(storageKey, id);
    } catch {
      // Storage can be blocked; the choice still holds until the page reloads.
    }
  }

  return { chosenId, choose };
}

function readChosenId(): string | null {
  try {
    return sessionStorage.getItem(storageKey);
  } catch {
    return null;
  }
}
