import type { ShowDetail } from '@living-stage/shared';
import { useEffect, useState } from 'react';
import { fetchShow } from '../api/shows.ts';

export type ShowState =
  { status: 'loading' } | { status: 'failed' } | { status: 'ready'; show: ShowDetail };

export function useShow(schoolId: string, showId: string) {
  const [state, setState] = useState<ShowState>({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    fetchShow(schoolId, showId, controller.signal)
      .then((show) => setState({ status: 'ready', show }))
      .catch(() => {
        if (!controller.signal.aborted) setState({ status: 'failed' });
      });
    return () => controller.abort();
  }, [schoolId, showId]);

  return { state };
}
