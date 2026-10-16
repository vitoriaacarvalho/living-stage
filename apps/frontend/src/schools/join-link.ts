const JOIN_PATH = /^\/join\/([^/]+)\/?$/;

export function inviteLink(origin: string, code: string): string {
  return `${origin}/join/${code}`;
}

export function readJoinCode(pathname: string): string | null {
  const match = JOIN_PATH.exec(pathname);
  return match ? decodeURIComponent(match[1]!) : null;
}
