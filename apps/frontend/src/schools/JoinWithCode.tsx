import type { School } from '@living-stage/shared';
import { useState } from 'react';
import { JoinCodeForm, type FoundInvite } from './JoinCodeForm.tsx';
import { JoinConfirm } from './JoinConfirm.tsx';

export function JoinWithCode({ onJoined }: { onJoined: (school: School) => void }) {
  const [found, setFound] = useState<FoundInvite | null>(null);

  if (!found) return <JoinCodeForm onFound={setFound} />;
  return (
    <JoinConfirm
      invite={found}
      onJoined={onJoined}
      cancel={{ label: 'Use another code', onClick: () => setFound(null) }}
    />
  );
}
