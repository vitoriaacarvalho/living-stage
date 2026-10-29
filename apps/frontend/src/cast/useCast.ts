import type { CastMember, CastMemberInput } from '@living-stage/shared';
import { useEffect, useState } from 'react';
import { addCastMember, fetchCast } from '../api/cast.ts';

export type CastState =
  { status: 'loading' } | { status: 'failed' } | { status: 'ready'; cast: CastMember[] };

export function useCast(schoolId: string, danceId: string) {
  const [state, setState] = useState<CastState>({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    fetchCast(schoolId, danceId, controller.signal)
      .then((cast) => setState({ status: 'ready', cast }))
      .catch(() => {
        if (!controller.signal.aborted) setState({ status: 'failed' });
      });
    return () => controller.abort();
  }, [schoolId, danceId]);

  async function add(input: CastMemberInput) {
    const castMember = await addCastMember(schoolId, danceId, input);
    setState((current) => ({
      status: 'ready',
      cast: [...(current.status === 'ready' ? current.cast : []), castMember],
    }));
  }

  return { state, add };
}
