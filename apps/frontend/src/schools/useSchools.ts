import type { School } from '@living-stage/shared';
import { useEffect, useState } from 'react';
import { fetchSchools } from '../api/schools.ts';

export type SchoolsState =
  { status: 'loading' } | { status: 'failed' } | { status: 'ready'; schools: School[] };

export function useSchools() {
  const [state, setState] = useState<SchoolsState>({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    fetchSchools(controller.signal)
      .then((schools) => setState({ status: 'ready', schools }))
      .catch(() => {
        if (!controller.signal.aborted) setState({ status: 'failed' });
      });
    return () => controller.abort();
  }, []);

  function addSchool(school: School) {
    setState((current) => ({
      status: 'ready',
      schools: current.status === 'ready' ? [...current.schools, school] : [school],
    }));
  }

  return { state, addSchool };
}
