import type { Invite } from '@living-stage/shared';
import { useEffect, useState } from 'react';
import { createInvite, fetchInvite } from '../api/invites.ts';

export type InviteState =
  { status: 'loading' } | { status: 'failed' } | { status: 'ready'; invite: Invite | null };

export function useSchoolInvite(schoolId: string) {
  const [state, setState] = useState<InviteState>({ status: 'loading' });

  useEffect(() => {
    const controller = new AbortController();
    fetchInvite(schoolId, controller.signal)
      .then((invite) => setState({ status: 'ready', invite }))
      .catch(() => {
        if (!controller.signal.aborted) setState({ status: 'failed' });
      });
    return () => controller.abort();
  }, [schoolId]);

  async function makeNewCode() {
    const invite = await createInvite(schoolId);
    setState({ status: 'ready', invite });
  }

  return { state, makeNewCode };
}
