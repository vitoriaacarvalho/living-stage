import type { ShowInput, ShowSummary } from '@living-stage/shared';
import { useEffect, useState } from 'react';
import { createShow, fetchShows } from '../api/shows.ts';

export type ShowsState =
  { status: 'loading' } | { status: 'failed' } | { status: 'ready'; shows: ShowSummary[] };

export function useShows(schoolId: string) {
  const [state, setState] = useState<ShowsState>({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    fetchShows(schoolId, controller.signal)
      .then((shows) => setState({ status: 'ready', shows }))
      .catch(() => {
        if (!controller.signal.aborted) setState({ status: 'failed' });
      });
    return () => controller.abort();
  }, [schoolId]);

  // A new show holds only its first, empty act.
  async function add(input: ShowInput) {
    const show = await createShow(schoolId, input);
    const summary = { ...show, actCount: 1, danceCount: 0, preview: [] };
    setState((current) => ({
      status: 'ready',
      shows: [summary, ...(current.status === 'ready' ? current.shows : [])],
    }));
  }

  return { state, add };
}
